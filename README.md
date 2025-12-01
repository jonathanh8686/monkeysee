# MonkeySee

We're gonna make some predictions.


### Features

 - Make Predictions
    - This needs to be an easy interface because these clowns won't spend any time on this. Basically just a text box, and we rely on everyone not to troll. Not sure what other kinds of validation we could do. We're gonna need everyone to sign-in to their Google accounts or something to make these predictions work, this is the most annoying part.

 - Rank Predictions
    - I'm thinking something like Beli where two are compared against each other, and you say which you think is more likely. I hope we can get something like 100 predictions, and we can form some sort of ranking of them.


### Resolver
I have a year to figure this out.


## Backend (FastAPI)

The `monkeysee_api` package exposes a FastAPI backend that stores predictions in a local SQLite database.

### Setup

1. Create and activate a Python 3.11 virtual environment.
2. Install dependencies:

   ```
   pip install -r monkeysee_api/requirements.txt
   ```

3. Start the dev server (hot reload enabled):

   ```
   uvicorn monkeysee_api.api:app --reload
   ```

The app listens on `http://127.0.0.1:8000` by default.

### Key Endpoints

- `GET /health` – Basic readiness probe.
- `POST /predictions` – Create a prediction. Body fields:
  - `content` (string, required)
  - `author_name` (string, optional; pulled from Google)
  - `confidence` (0-100, optional)
- `GET /predictions` – List predictions, supports `status`, `search`, `skip`, and `limit` query params.
- `GET /predictions/{id}` – Fetch a single prediction.
- `PATCH /predictions/{id}` – Update prediction content, status, or resolution metadata.
- `GET /predictions/summary` – Aggregate counts per status for leaderboard widgets.

All responses are JSON; see the FastAPI docs at `http://127.0.0.1:8000/docs` for the full schema and to try the endpoints interactively.