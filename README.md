# Reflex

Reflex is a delivery management system I built for small Kenyan retailers who currently rely on WhatsApp and phone calls to coordinate deliveries.

The idea is simple: a retailer creates a delivery request, a dispatcher assigns it to a rider, and the rider updates the delivery as it moves from assignment to pickup and finally to delivery.

The system keeps the delivery information and status in one place instead of relying on separate messages and calls.

## Problem

Small Kenyan retailers can end up coordinating deliveries through WhatsApp messages and phone calls. This makes it difficult to know who has been assigned to a delivery, what stage the delivery is at, and what happened along the way.

I built Reflex to give the retailer, dispatcher, and rider one shared place to manage that process.

## User Roles

### Retailer

The retailer creates a delivery request by entering:

- Customer name
- Customer phone
- Delivery address
- Item description

### Dispatcher

The dispatcher can view delivery requests and assign them to a rider.

### Rider

The rider can see deliveries assigned to them and update the delivery status:

`ASSIGNED → PICKED_UP → DELIVERED`

## Features

- Create new delivery requests
- View all delivery requests
- Assign deliveries to riders
- Update delivery status
- Enforce the delivery status flow
- Keep a history of delivery status changes
- Confirm an order using an order code
- Validate required delivery information
- Reject invalid delivery status changes

## Delivery Status Flow

A delivery follows this basic flow:

`REQUESTED → ASSIGNED → PICKED_UP → DELIVERED`

The backend controls the allowed transitions so a delivery cannot skip stages. For example, a delivery in `REQUESTED` cannot be changed directly to `DELIVERED`.

## Architecture

I separated Reflex into three main parts:

```text
React / Vite frontend
        ↓
   Express API
        ↓
Supabase database

## API Endpoints

The main API endpoints I built are:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check that the server is running |
| POST | `/deliveries` | Create a new delivery |
| GET | `/deliveries` | Get all deliveries |
| POST | `/deliveries/:id/assign` | Assign a rider |
| PATCH | `/deliveries/:id/status` | Update delivery status |
| GET | `/deliveries/:id/events` | View delivery history |
| POST | `/deliveries/:id/confirm` | Confirm an order using an order code |

The API is currently deployed on Render:

https://reflex-api-a2zr.onrender.com

## Technology Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** Supabase
- **Deployment:** Vercel for the frontend and Render for the API
- **Version control:** GitHub

## Deployment

The Reflex API is deployed on Render and is available at:

https://reflex-api-a2zr.onrender.com

The frontend is deployed separately and communicates with the API through its deployed URL.

For local development, the frontend and backend can also be run separately on the developer's machine.

## Testing

I tested the main delivery workflow as well as a few invalid actions.

| Test | Expected result | Result |
|---|---|---|
| Create a delivery | Delivery is created with `REQUESTED` status | PASS |
| Assign a rider | Delivery changes to `ASSIGNED` | PASS |
| Pick up delivery | Delivery changes to `PICKED_UP` | PASS |
| Complete delivery | Delivery changes to `DELIVERED` | PASS |
| Submit missing required information | Request is rejected | PASS |
| Repeat an invalid status change | Request is rejected | PASS |
| Skip from `REQUESTED` to `DELIVERED` | Request is rejected | PASS |
| Check delivery event history | Status changes and actors are returned | PASS |

One of the important checks was trying to move delivery `D008` directly from `REQUESTED` to `DELIVERED`. The API rejected the request with:

```text
Cannot change status from REQUESTED to DELIVERED

## Trade-offs and Limitations

This is a working prototype, so I made some choices to keep the scope manageable.

### 1. Fixed rider assignment

For the prototype, the frontend assigns a specific rider (`R001`) instead of providing a full rider selection and management system.

**Acceptable because:** I wanted to prove the assignment workflow first without spending most of the build time on rider management.

**With more time:** I would add a proper rider list, availability status, and dispatcher selection.

### 2. Simple role handling

The current prototype shows the retailer, dispatcher, and rider workflows in the same frontend instead of having separate authenticated user experiences.

**Acceptable because:** The goal of the prototype was to demonstrate the delivery workflow and backend logic rather than build a complete authentication system.

**With more time:** I would add authentication and role-based access so each user only sees the actions relevant to them.

### 3. Delivery ID generation

Delivery IDs are currently generated using the number of existing deliveries and incrementing it.

**Acceptable because:** It was simple and sufficient for a small prototype.

**With more time:** I would use a database-generated ID or UUID so concurrent requests could not create conflicting IDs.

### 4. No real-time updates

The frontend currently reloads the delivery list after an action instead of receiving live updates from the backend.

**Acceptable because:** This kept the prototype simple while still demonstrating the main workflow.

**With more time:** I would add real-time updates using WebSockets or Supabase Realtime so changes appear immediately for other users.

### 5. Order confirmation is basic

The order confirmation endpoint checks an order code, but the prototype does not yet include a complete scanning experience.

**Acceptable because:** The backend proof-of-concept was enough to demonstrate how confirmation could work.

**With more time:** I would add QR/barcode scanning and connect the scan directly to the delivery confirmation process.

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/KevinKay-art/reflex.git
cd reflex

## Live Project

- **Backend API:** https://reflex-api-a2zr.onrender.com