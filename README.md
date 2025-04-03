# CSC3094 Major Dissertation and Project: NeoPancreas

## Building and running

### Docker container

This project requires multiple moving parts, and so a Docker Compose file was written to run each image necessary for the project.

```bash
docker compose up --build
```

## Running tests

Three sets of unit tests are provided: back-end unit testing (for Django, Celery, Redis), front-end unit testing (for React, WebSockets and API connections) and simulation unit tests (separate Simglucose-based simulations for running algorithms.)

### Running back-end tests

```bash
cd backend
python manage.py test
```

### Running front-end tests

```bash
cd frontend
npm test
```

### Running simulation tests

```bash
cd simulations
python run.py [--all]
```

If the --all argument isn't inputted, you will see a prompt on what range of tests you want to run:

```bash
Enter the starting test number (1-7): _
Enter the ending test number (1-7): _
```

To run the miscellaneous tests:
```bash
python run.py --misc
```

## .env Attributes

### Back-end

```env
DJANGO_SETTINGS_MODULE="backend.settings"
DJANGO_SECRET_KEY=django_password
DEBUG=True
REDIS_URL=redis_server_url
CELERY_BROKER_URL=redis_server_url
CELERY_RESULT_BACKEND=redis_server_url
CELERY_LOG_LEVEL=DEBUG
```

### Front-end

```env
VITE_API_URL=backend_url
VITE_WEBSOCKET_URL=backend_url/different_port
```

## Package docs

- [React](https://react.dev/)
- [Django](https://docs.djangoproject.com/en/5.1/)
- [Simglucose](https://github.com/jxx123/simglucose)
- [Prettier](https://prettier.io/docs/)
- [Ruff](https://docs.astral.sh/ruff/)
