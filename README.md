# 🔐 Face Lock

A **face-recognition-based locking system** for one authorized person. Uses browser-side face detection and embedding generation with **face-api.js** to compare webcam scans against a registered dataset of reference face images.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technologies Used](#technologies-used)
4. [Required Browser Features](#required-browser-features)
5. [Installation & Setup](#installation--setup)
6. [Preparing the Dataset](#preparing-the-dataset)
7. [Registering the Dataset](#registering-the-dataset)
8. [Starting the Server](#starting-the-server)
9. [Accessing the Application](#accessing-the-application)
10. [How Recognition Works](#how-recognition-works)
11. [How Similarity Is Calculated](#how-similarity-is-calculated)
12. [Threshold Selection](#threshold-selection)
13. [Testing the System](#testing-the-system)
14. [Known Limitations](#known-limitations)
15. [Privacy & Security](#privacy--security)
16. [Future Improvements](#future-improvements)

---

## Project Overview

Face Lock is a single-person face recognition system designed as a prototype security lock. A reference dataset of 50–100+ face images of the authorized person is preprocessed into 128-dimensional face embeddings. When a face is scanned via webcam, the system compares the scanned embedding against all stored reference embeddings and determines whether the face matches the authorized person.

**Key pages:**

| Page | URL | Purpose |
|------|-----|---------|
| **Scan** | `/` | Main face scanning interface with LOCKED / UNLOCKED status |
| **Register** | `/register.html` | Upload and preprocess reference face images |
| **Test** | `/test.html` | Evaluate recognition performance with detailed rankings |
| **Settings** | `/settings.html` | Configure threshold and decision strategy |

---

## System Architecture

```
                    WEBCAM
                       ↓
                 JavaScript
                       ↓
            Face Detection (SSD MobileNet v1)
                       ↓
           Facial Landmark Detection (68-point)
                       ↓
         Face Embedding Generation (128-dim descriptor)
                       ↓
              Scanned Face Embedding
                       ↓
                  localStorage / JSON Files
                       ↓
           Stored Reference Embeddings
                 (embeddings.json)
                       ↓
            Cosine Similarity Calculation
                       ↓
              Best Match / Top-K Analysis
                       ↓
               Threshold Comparison
                 ↙           ↘
            MATCH          NO MATCH
              ↓               ↓
        🔓 UNLOCKED       🔒 LOCKED
```

---

## Technologies Used

| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure and semantic markup |
| **CSS3** | Styling with glassmorphism, gradients, animations |
| **JavaScript (ES6+)** | Face detection, embedding generation, similarity calculation |
| **localStorage** | Client-side data persistence |
| **JSON** | Data export/import for embeddings and settings |
| **face-api.js** | Browser-compatible face recognition library (TensorFlow.js-based) |

**No PHP, MySQL, Python, Node.js, or server-side frameworks are required.** Everything runs entirely in the browser.

---

## Required Browser Features

- **WebRTC / getUserMedia** — webcam access
- **Canvas API** — image processing
- **WebGL** — hardware-accelerated model inference (via TensorFlow.js)
- **localStorage** — client-side data persistence
- **File API** — image upload and JSON import/export

**Recommended browsers:** Chrome 80+, Firefox 78+, Edge 80+, Safari 14+

---

## Installation & Setup

### 1. Prerequisites

- Any **static HTTP server** (e.g., VS Code Live Server, `npx serve`, Python `http.server`, etc.)
- Modern web browser (see above)
- Internet connection (for first load — fetches face-api.js from CDN)

### 2. Download Model Weights

The face recognition models must be downloaded to the `/models` directory. Run the provided PowerShell script:

```powershell
# Option A: Run the script directly
powershell -ExecutionPolicy Bypass -File download_models.ps1

# Option B: Manual download (PowerShell)
cd face-lock
powershell -ExecutionPolicy Bypass -File download_models.ps1
```

This downloads 8 model files (~6 MB total):

| Model | Files | Purpose |
|-------|-------|---------|
| SSD MobileNet v1 | manifest + 2 shards | Face detection |
| Face Landmark 68 | manifest + 1 shard | Facial landmark localisation |
| Face Recognition | manifest + 2 shards | 128-dim embedding generation |

### 3. Verify Directory Structure

```
face-lock/
├── index.html              # Main scan page
├── register.html           # Dataset registration
├── test.html               # Performance testing
├── settings.html           # Threshold settings
├── css/
│   └── style.css           # Design system
├── js/
│   ├── app.js              # Shared config & utilities
│   ├── register.js         # Registration logic
│   ├── recognition.js      # Scan & match logic
│   ├── test.js             # Test page logic
│   └── settings.js         # Settings page logic
├── php/                    # (Legacy — no longer required)
│   └── ...                 # PHP files kept for reference only
├── data/
│   ├── embeddings.json     # Initial/fallback face embeddings
│   └── settings.json       # Initial/fallback settings
├── dataset/
│   └── owner/              # Place reference images here
├── models/                 # face-api.js model weights (downloaded)
├── download_models.ps1     # Model download script
└── README.md               # This file
```

---

## Preparing the Dataset

Collect **50–100+** face images of the authorized person. Store them in `dataset/owner/`.

**Best practices for image collection:**

- ✅ Different facial expressions (smile, neutral, frown)
- ✅ Slightly different head poses (straight, slight left/right)
- ✅ Different distances from camera (close-up, medium, far)
- ✅ Different lighting conditions (natural, indoor, dim)
- ✅ With and without glasses (if applicable)
- ✅ Different times of day
- ❌ Do NOT include images of other people
- ❌ Do NOT use heavily filtered/edited images
- ❌ Avoid images where the face is obscured or out of focus

**Supported formats:** JPG, PNG, WebP

---

## Registering the Dataset

1. Start any static HTTP server (see below)
2. Navigate to the Register page
3. Click the upload area or drag & drop your face images
4. Click **Process Images**
5. Wait for all images to be processed:
   - `SUCCESS` — Face detected and embedding generated
   - `NO FACE DETECTED` — Image skipped
   - `MULTIPLE FACES DETECTED` — Image skipped
6. Review the summary statistics
7. Click **Save Embeddings** — data is saved to localStorage and a JSON file is downloaded

The downloaded `embeddings.json` can be placed in the `data/` directory as a fallback, or re-imported via the Settings page.

---

## Starting the Server

Use any static HTTP server. Examples:

```bash
# Option A: VS Code Live Server extension (recommended)
# Just right-click index.html → "Open with Live Server"

# Option B: npx serve
npx serve .

# Option C: Python
python -m http.server 8000

# Option D: PHP (still works, just not required)
php -S localhost:8000
```

Then open your browser to the server URL (e.g., `http://localhost:8000`).

> **Note:** Do NOT open the HTML files directly (via `file://`). Model loading requires an HTTP server.

---

## Accessing the Application

| URL | Page |
|-----|------|
| `http://localhost:8000` | Main scanning interface |
| `http://localhost:8000/register.html` | Dataset registration |
| `http://localhost:8000/test.html` | Performance testing |
| `http://localhost:8000/settings.html` | Settings |

---

## How Recognition Works

### Registration (one-time)

1. Each reference image is loaded in the browser
2. **SSD MobileNet v1** detects face bounding boxes
3. **Face Landmark 68** identifies 68 facial landmarks
4. **Face Recognition Net** generates a **128-dimensional descriptor** (embedding)
5. All valid embeddings are saved to localStorage and exported as a JSON file

### Scanning (each authentication)

1. A frame is captured from the webcam
2. Face detection → landmark detection → embedding generation (same pipeline)
3. The scanned embedding is compared against **every** stored reference embedding
4. **Cosine similarity** is computed for each pair
5. Results are ranked by similarity (highest first)
6. Top-5 statistics are calculated
7. The decision score is compared against the threshold
8. Result: **UNLOCKED** or **LOCKED**

---

## How Similarity Is Calculated

### Cosine Similarity

The primary metric is **cosine similarity** between two 128-dimensional embedding vectors:

```
                    A · B
similarity = ─────────────────
              ‖A‖ × ‖B‖
```

- **1.0** = identical vectors (perfect match)
- **0.0** = orthogonal vectors (no similarity)
- Typical same-person range: **0.45 – 0.85+**
- Typical different-person range: **0.10 – 0.40**

### Euclidean Distance

Also calculated as a secondary metric:

```
distance = √(Σ(Aᵢ - Bᵢ)²)
```

Lower distance = more similar. Displayed in the Test page for reference.

### Top-K Analysis

Instead of relying on a single best match, the system calculates:
- **Best similarity** — highest cosine similarity across all reference samples
- **Top-5 average** — mean of the 5 highest similarities
- **Decision score** — based on the selected strategy (best, top-K avg, or combined)

---

## Threshold Selection

The recognition threshold determines the minimum similarity required for a match.

**The threshold is NOT a universal value.** It depends on:

- Quality and diversity of reference images
- Webcam quality
- Lighting conditions
- The face recognition model's characteristics

### How to Calibrate

1. Go to the **Test** page
2. Scan the authorized person's face multiple times in different conditions
3. Note the similarity values (these are your "genuine" scores)
4. Optionally, have a different person scan their face
5. Note their similarity values (these are your "impostor" scores)
6. Set the threshold between the lowest genuine score and the highest impostor score

### Default

The default threshold is **0.55**. Adjust via the Settings page.

| Range | Behaviour |
|-------|-----------|
| 0.30 – 0.45 | Very permissive — high false-accept risk |
| 0.45 – 0.60 | Balanced — suitable for most setups |
| 0.60 – 0.80 | Strict — may reject the authorized person in poor conditions |
| 0.80+ | Very strict — likely to reject even the authorized person |

---

## Testing the System

The **Test** page (`/test.html`) provides:

1. Full ranking of all reference samples by similarity
2. Visual similarity bars
3. Euclidean distance for each sample
4. Top-5 identification
5. Summary statistics:
   - Total reference samples
   - Best similarity
   - Top-5 average
   - Decision score
   - Current threshold
   - Current strategy
   - Final decision (UNLOCKED / LOCKED)

Use this page to:
- Verify the authorized person is consistently recognized
- Test with different angles, expressions, and lighting
- Evaluate false-rejection rate
- Test with other people to evaluate false-acceptance rate
- Fine-tune the threshold

---

## Known Limitations

1. **No liveness detection** — The system cannot distinguish between a live person and a printed photo or video replay. Do not rely on this as the sole authentication mechanism.

2. **Browser-dependent performance** — Face detection and embedding generation run in the browser using TensorFlow.js. Performance depends on the device's CPU/GPU capabilities.

3. **Lighting sensitivity** — Extreme lighting conditions (very dark or overexposed) may reduce recognition accuracy.

4. **Single person only** — The system is designed for one authorized person. Supporting multiple people would require architectural changes.

5. **No encryption** — Embeddings are stored as plaintext JSON. In a production system, they should be encrypted.

6. **No session management** — There is no login system or access control for the registration/settings pages.

7. **Model size** — The face-api.js models total ~6 MB and must be downloaded before first use.

8. **Cosine similarity distribution** — The similarity values from face-api.js descriptors may not perfectly follow expected distributions. Always calibrate the threshold experimentally.

---

## Privacy & Security

### Biometric Data Warning

Face embeddings are **sensitive biometric data**. Unlike passwords, biometric data cannot be changed if compromised.

### Protections in this Prototype

- ✅ Embeddings are generated **locally in the browser** — original images are not sent to the server
- ✅ PHP endpoints validate input and prevent arbitrary file path manipulation
- ✅ Webcam frames are not permanently stored
- ✅ The person name field is sanitised (alphanumeric only)
- ✅ File writes use `LOCK_EX` to prevent corruption

### Recommendations for Production Use

- 🔒 Encrypt `data/embeddings.json` at rest
- 🔒 Add authentication to the registration and settings pages
- 🔒 Use HTTPS in production
- 🔒 Implement liveness detection (blink detection, head movement)
- 🔒 Add rate limiting to prevent brute-force attacks
- 🔒 Log authentication attempts
- 🔒 Consider storing embeddings in an encrypted database

---

## Future Improvements

- [ ] **Liveness detection** — Require blink or head movement to prevent photo/video spoofing
- [ ] **Continuous monitoring** — Auto-lock after timeout, periodic re-verification
- [ ] **Multi-person support** — Allow multiple authorized users
- [ ] **Embedding encryption** — Encrypt stored biometric data
- [ ] **Authentication logging** — Track unlock/lock events with timestamps
- [ ] **Progressive enrollment** — Add new reference images from successful scans
- [ ] **Confidence heatmap** — Visualise which facial regions contribute most to the match
- [ ] **WebSocket real-time scanning** — Continuous face tracking without manual button press
- [ ] **TinyFaceDetector** — Optional fast detection model for lower-powered devices
- [ ] **Export/Import** — Backup and restore embedding data
- [ ] **HTTPS enforcement** — Secure webcam access in production environments

---

## License

This project is a prototype for educational and demonstration purposes.

---

*Built with [face-api.js](https://github.com/justadudewhohacks/face-api.js) by Vincent Mühler*
