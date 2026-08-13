from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_db_check():
    response = client.get("/db-check")
    assert response.status_code == 200
    # It will return failed or connected depending on the docker container status
    assert "status" in response.json()
