const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Reflex server is running"
  });
});

app.post("/deliveries", async (req, res) => {
  const {
    customerName,
    customerPhone,
    address,
    itemDescription
  } = req.body;

  if (!customerName || !customerPhone || !address || !itemDescription) {
    return res.status(400).json({
      message: "All delivery fields are required"
    });
  }

  const { count, error: countError } = await supabase
    .from("deliveries")
    .select("*", { count: "exact", head: true });

  if (countError) {
    return res.status(500).json({
      message: "Could not check delivery count",
      error: countError.message
    });
  }

  const deliveryId = `D${String((count || 0) + 1).padStart(3, "0")}`;

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .insert({
      id: deliveryId,
      customer_name: customerName,
      customer_phone: customerPhone,
      address,
      item_description: itemDescription,
      status: "REQUESTED"
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: "Could not create delivery",
      error: error.message
    });
  }

  await supabase.from("delivery_events").insert({
    delivery_id: delivery.id,
    status: "REQUESTED",
    changed_by: "RETAILER"
  });

  res.status(201).json({
    id: delivery.id,
    customerName: delivery.customer_name,
    customerPhone: delivery.customer_phone,
    address: delivery.address,
    itemDescription: delivery.item_description,
    status: delivery.status,
    riderId: delivery.rider_id
  });
});

app.get("/deliveries", async (req, res) => {
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({
      message: "Could not load deliveries",
      error: error.message
    });
  }

  const deliveries = data.map((delivery) => ({
    id: delivery.id,
    customerName: delivery.customer_name,
    customerPhone: delivery.customer_phone,
    address: delivery.address,
    itemDescription: delivery.item_description,
    status: delivery.status,
    riderId: delivery.rider_id
  }));

  res.json({
    count: deliveries.length,
    deliveries
  });
});

app.post("/deliveries/:id/assign", async (req, res) => {
  const deliveryId = req.params.id;
  const { riderId } = req.body;

  const { data: delivery, error: deliveryError } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", deliveryId)
    .single();

  if (deliveryError || !delivery) {
    return res.status(404).json({
      message: "Delivery not found"
    });
  }

  const { data: rider, error: riderError } = await supabase
    .from("users")
    .select("*")
    .eq("id", riderId)
    .eq("role", "RIDER")
    .single();

  if (riderError || !rider) {
    return res.status(404).json({
      message: "Rider not found"
    });
  }

  if (delivery.status !== "REQUESTED") {
    return res.status(400).json({
      message: "Only REQUESTED deliveries can be assigned"
    });
  }

  const { data: updatedDelivery, error: updateError } = await supabase
    .from("deliveries")
    .update({
      rider_id: rider.id,
      status: "ASSIGNED",
      updated_at: new Date().toISOString()
    })
    .eq("id", deliveryId)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({
      message: "Could not assign rider",
      error: updateError.message
    });
  }

  await supabase.from("delivery_events").insert({
    delivery_id: deliveryId,
    status: "ASSIGNED",
    changed_by: "DISPATCHER"
  });

  res.json({
    message: "Rider assigned successfully",
    delivery: {
      id: updatedDelivery.id,
      status: updatedDelivery.status,
      riderId: updatedDelivery.rider_id
    }
  });
});

app.patch("/deliveries/:id/status", async (req, res) => {
  const deliveryId = req.params.id;
  const { status } = req.body;

  const { data: delivery, error: deliveryError } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", deliveryId)
    .single();

  if (deliveryError || !delivery) {
    return res.status(404).json({
      message: "Delivery not found"
    });
  }

  const allowedTransitions = {
    ASSIGNED: ["PICKED_UP"],
    PICKED_UP: ["DELIVERED"]
  };

  if (!allowedTransitions[delivery.status]?.includes(status)) {
    return res.status(400).json({
      message: `Cannot change status from ${delivery.status} to ${status}`
    });
  }

  const { data: updatedDelivery, error: updateError } = await supabase
    .from("deliveries")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", deliveryId)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({
      message: "Could not update delivery status",
      error: updateError.message
    });
  }

  await supabase.from("delivery_events").insert({
    delivery_id: deliveryId,
    status,
    changed_by: "RIDER"
  });

  res.json({
    message: "Delivery status updated",
    delivery: {
      id: updatedDelivery.id,
      status: updatedDelivery.status,
      riderId: updatedDelivery.rider_id
    }
  });
});

app.get("/deliveries/:id/events", async (req, res) => {
  const deliveryId = req.params.id;

  const { data: events, error } = await supabase
    .from("delivery_events")
    .select("*")
    .eq("delivery_id", deliveryId)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({
      message: "Could not load delivery history",
      error: error.message
    });
  }

  res.json({
    deliveryId,
    events: events.map((event) => ({
      deliveryId: event.delivery_id,
      status: event.status,
      changedBy: event.changed_by,
      createdAt: event.created_at
    }))
  });
});

app.post("/deliveries/:id/confirm", async (req, res) => {
  const deliveryId = req.params.id;
  const { orderCode } = req.body;

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", deliveryId)
    .single();

  if (error || !delivery) {
    return res.status(404).json({
      message: "Delivery not found"
    });
  }

  if (delivery.order_code !== orderCode) {
    return res.status(400).json({
      message: "Order code does not match this delivery"
    });
  }

  res.json({
    message: "Order confirmed",
    deliveryId,
    orderCode
  });
});

app.get("/users/profile/:authId", async (req, res) => {
  const authId = req.params.authId;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, phone, role, auth_id")
    .eq("auth_id", authId)
    .single();

  if (error || !user) {
    return res.status(404).json({
      message: "User profile not found"
    });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role
    }
  });
});

app.listen(PORT, () => {
  console.log(`Reflex server running on http://localhost:${PORT}`);
});