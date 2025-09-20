
Medical Supply MVP - Backend
----------------------------

Quick start (local sqlite):
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  python app.py initdb
  python app.py run

To use PostgreSQL:
  export DATABASE_URL=postgresql://user:pass@host:5432/med_supply
  export APP_SECRET=change-me
  python app.py initdb
  python app.py run

Daraja (M-Pesa):
  utils/daraja.py contains a stub for initiate_stk_push - implement the real HTTP flow and credentials.

Courier Links:
  /orders/<order_id>/courier_link returns deep links for Uber/Bolt pre-filled with pickup/dropoff.
