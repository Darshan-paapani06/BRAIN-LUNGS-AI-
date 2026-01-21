# BRAIN-LUNGS-AI-
AI Health Care is a demo web app that showcases ML-based risk prediction for brain, heart and lung conditions. A Python backend serves pre-trained models to simple HTML pages, making it ideal for hackathons, college demos and quick experiments in AI for healthcare.


## Project structure

```text
AI_health_care/
├── assets/                 # Static frontend assets (images, styles, etc.)
│
├── brain/
│   └── artifacts/          # Saved artifacts for brain-related ML model(s)
│
├── lung/
│   └── artifacts/          # Saved artifacts for lung-related ML model(s)
│
├── server/                 # Python backend (API / prediction server)
│
├── index.html              # Landing page / home UI
├── brain.html              # Brain disease prediction page
├── heart.html              # Heart disease prediction page
├── lung.html               # Lung disease prediction page
│
├── render.yaml             # Deployment configuration (Render.com style)
├── runtime.txt             # Python runtime version hint for deployment
├── .python-version         # Local Python version (pyenv/tooling)
├── .gitignore              # Git ignore rules
├── .gitattributes          # Git attributes configuration
├── LICENSE                 # Apache 2.0 license
