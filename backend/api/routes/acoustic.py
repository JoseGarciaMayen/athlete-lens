from fastapi import APIRouter, UploadFile, File, HTTPException
from core.acoustic.extractor import analyze
import tempfile
import os

router = APIRouter()

@router.post("/analyze/acoustic")
async def analyze_acoustic(file: UploadFile = File(...)):
    contents = await file.read()

    if not contents:
        raise HTTPException(status_code=422, detail="File is empty")

    with tempfile.NamedTemporaryFile(delete=True, suffix = os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(contents)
        tmp.flush()

        try:
            result = analyze(tmp.name)
        except Exception as e:
            raise HTTPException(status_code=422, detail=str(e))

    return result
        
    