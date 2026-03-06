# Bitespeed Identity Reconciliation

Not gonna lie, this problem is more interesting than it looks at first glance.

The "primary turns secondary" edge case caught me off guard initially. Two separate
customers, two separate purchase histories, and one request suddenly proves they are
the same person. The older cluster wins. Simple rule, but easy to miss if you are
just skimming the spec.

## Live Endpoint

🌐 [https://bitespeed-identity-130433035304.us-central1.run.app/](https://bitespeed-identity-130433035304.us-central1.run.app/)

## How it works

You send an email or phone number (or both). The service figures out if this person
has been seen before under a different email or phone. If yes, it links them together
and returns one consolidated identity. If no, it creates a new contact.

The tricky part: when a request links two previously unrelated primary contacts,
the older one stays primary, and the newer one gets demoted to secondary. All of
the newer one's secondaries get re-parented to the true primary too.

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Google Cloud Run
- Google Cloud SQL

## Try it

New customer:
```bash
curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "tony@stark.com", "phoneNumber": "1234567890"}'
```

Same phone, different email (links as secondary):
```bash
curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "ironman@avengers.com", "phoneNumber": "1234567890"}'
```

Query by email only:
```bash
curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "tony@stark.com"}'
```

Query by phone only:
```bash
curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890"}'
```

Create separate customer:
```bash
curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "steve@rogers.com", "phoneNumber": "9999999999"}'
```

Link two primaries (older one wins):
```bash
curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "steve@rogers.com", "phoneNumber": "1234567890"}'
```

Health check:
```bash
curl https://bitespeed-identity-130433035304.us-central1.run.app/health
```

## Deploy your own

1. Create a GCP project and enable Cloud Run, Cloud SQL, and Cloud Build.
2. Create a PostgreSQL 15 instance on Cloud SQL.
3. Run:

```bash
gcloud run deploy bitespeed-identity \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances YOUR_PROJECT:us-central1:YOUR_INSTANCE \
  --set-env-vars "DB_USER=postgres,DB_PASSWORD=your_password,DB_NAME=bitespeed,INSTANCE_CONNECTION_NAME=YOUR_PROJECT:us-central1:YOUR_INSTANCE"
```

## Author

Shreyash
https://github.com/cyb3rcr4t0712/bitespeed-identity