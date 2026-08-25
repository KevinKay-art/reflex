import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000";

function App() {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    address: "",
    itemDescription: ""
  });

  const [deliveries, setDeliveries] = useState([]);
  const [message, setMessage] = useState("");

  const loadDeliveries = async () => {
    try {
      const response = await fetch(`${API_URL}/deliveries`);
      const data = await response.json();
      setDeliveries(data.deliveries);
    } catch (error) {
      setMessage("Could not load deliveries");
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/deliveries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not create delivery");
        return;
      }

      setMessage(`Delivery ${data.id} created successfully`);

      setForm({
        customerName: "",
        customerPhone: "",
        address: "",
        itemDescription: ""
      });

      loadDeliveries();
    } catch (error) {
      setMessage("Could not connect to the Reflex server");
    }
  };

  const assignRider = async (deliveryId) => {
    try {
      const response = await fetch(
        `${API_URL}/deliveries/${deliveryId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            riderId: "R001"
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not assign rider");
        return;
      }

      setMessage(`Kevin assigned to ${deliveryId}`);
      loadDeliveries();
    } catch (error) {
      setMessage("Could not connect to the Reflex server");
    }
  };

  const updateStatus = async (deliveryId, status) => {
    try {
      const response = await fetch(
        `${API_URL}/deliveries/${deliveryId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not update status");
        return;
      }

      setMessage(`${deliveryId} updated to ${status}`);
      loadDeliveries();
    } catch (error) {
      setMessage("Could not connect to the Reflex server");
    }
  };

  return (
    <div>
      <h1>Reflex</h1>

      <hr />

      <h2>Retailer - Create Delivery</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            name="customerName"
            placeholder="Customer name"
            value={form.customerName}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            name="customerPhone"
            placeholder="Customer phone"
            value={form.customerPhone}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            name="address"
            placeholder="Delivery address"
            value={form.address}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            name="itemDescription"
            placeholder="Item description"
            value={form.itemDescription}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Create Delivery</button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>Dispatcher - Deliveries</h2>

      {deliveries.length === 0 ? (
        <p>No deliveries yet.</p>
      ) : (
        deliveries.map((delivery) => (
          <div key={delivery.id}>
            <h3>{delivery.id}</h3>

            <p>Customer: {delivery.customerName}</p>
            <p>Item: {delivery.itemDescription}</p>
            <p>Address: {delivery.address}</p>
            <p>
              Status: <strong>{delivery.status}</strong>
            </p>
            <p>
              Rider: {delivery.riderId || "Not assigned"}
            </p>

            {delivery.status === "REQUESTED" && (
              <button onClick={() => assignRider(delivery.id)}>
                Assign Kevin
              </button>
            )}

            <hr />
          </div>
        ))
      )}

      <h2>Rider - Kevin</h2>

      {deliveries
        .filter((delivery) => delivery.riderId === "R001")
        .map((delivery) => (
          <div key={`rider-${delivery.id}`}>
            <h3>{delivery.id}</h3>

            <p>Customer: {delivery.customerName}</p>
            <p>Item: {delivery.itemDescription}</p>
            <p>Address: {delivery.address}</p>

            <p>
              Status: <strong>{delivery.status}</strong>
            </p>

            {delivery.status === "ASSIGNED" && (
              <button
                onClick={() =>
                  updateStatus(delivery.id, "PICKED_UP")
                }
              >
                Picked Up
              </button>
            )}

            {delivery.status === "PICKED_UP" && (
              <button
                onClick={() =>
                  updateStatus(delivery.id, "DELIVERED")
                }
              >
                Mark Delivered
              </button>
            )}

            <hr />
          </div>
        ))}
    </div>
  );
}

export default App;