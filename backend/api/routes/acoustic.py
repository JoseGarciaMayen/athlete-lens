from fastapi import APIRouter, UploadFile, File
from core.acoustic.extractor import analyze
import tempfile
import os

router = APIRouter()

@router.post("/analyze/acoustic")
async def analyze_acoustic(file: UploadFile = File(...)):
    contents = await file.read()
    with tempfile.NamedTemporaryFile(delete=True, suffix = os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(contents)
        tmp.flush()
        result = analyze(tmp.name)
    return result
        
    