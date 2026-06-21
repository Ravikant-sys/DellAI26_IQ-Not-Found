import pytest
from backend.celery_app import celery_app

@pytest.fixture(scope="session", autouse=True)
def setup_test_celery():
    # Force Celery to run tasks inline synchronously without connecting to Redis
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
        result_backend="cache+memory://"
    )
