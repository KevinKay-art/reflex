import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";

const API_URL = "https://reflex-api-a2zr.onrender.com";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    address: "",
    itemDescription: ""
  });

  const [deliveries, setDeliveries] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Supabase session error:", error);
          setSession(null);
        } else {
          setSession(data.session);
        }
      } catch (error) {
        console.error("Could not get session:", error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadProfile(session.user.id);
    } else {
      setProfile(null);
    }
  }, [session]);

  const loadProfile = async (authId) => {
    try {
      const response = await fetch(
        `${API_URL}/users/profile/${authId}`
      );

      if (!response.ok) {
        setMessage("Could not load user profile");
        return;
      }

      const data = await response.json();
      setProfile(data.user);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the Reflex server");
    }
  };

  const loadDeliveries = async () => {
    try {
      const response = await fetch(`${API_URL}/deliveries`);

      if (!response.ok) {
        setMessage("Could not load deliveries");
        return;
      }

      const data = await response.json();
      setDeliveries(data.deliveries || []);
    } catch (error) {
      console.error(error);
      setMessage("Could not load deliveries");
    }
  };

  useEffect(() => {
    if (profile) {
      loadDeliveries();
    }
  }, [profile]);

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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
      setMessage("Could not connect to the Reflex server");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setDeliveries([]);
  };

  if (loading) {
    return <p>Loading Reflex...</p>;
  }

  if (!session) {
    return <Login onLogin={(user) => setSession({ user })} />;
  }

  if (!profile) {
    return (
      <div>
        <h1>Reflex</h1>
        <p>Loading user profile...</p>
        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>Reflex</h1>

      <p>
        Logged in as <strong>{profile.name}</strong> ({profile.role})
      </p>

      <button onClick={logout}>Logout</button>

      {message && <p>{message}</p>}

      <hr />

      {profile.role === "RETAILER" && (
        <>
          <h2>Retailer - New Delivery</h2>

          <form onSubmit={handleSubmit}>
            <div>
              <input
                name="customerName"
                placeholder="Customer name"
                value={form.customerName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <input
                name="customerPhone"
                placeholder="Customer phone"
                value={form.customerPhone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <input
                name="address"
                placeholder="Delivery address"
                value={form.address}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <input
                name="itemDescription"
                placeholder="Item description"
                value={form.itemDescription}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit">Create Delivery</button>
          </form>

          <hr />

          <h2>Deliveries</h2>

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
                <hr />
              </div>
            ))
          )}
        </>
      )}

      {profile.role === "DISPATCHER" && (
        <>
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
        </>
      )}

      {profile.role === "RIDER" && (
        <>
          <h2>Rider - {profile.name}</h2>

          {deliveries
            .filter((delivery) => delivery.riderId === profile.id)
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
        </>
      )}
    </div>
  );
}

export default App;