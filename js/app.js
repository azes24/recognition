/**
 * Face Lock — Single Page Application
 *
 * Loads face-api.js models, loads reference embeddings from data/embeddings.json,
 * starts webcam, and continuously scans for face matches.
 *
 * No PHP, no server-side code. Just static files.
 */

(function () {
    'use strict';

    // ── Configuration ──────────────────────────────────────
    const CONFIG = {
        modelUrl: 'models',
        embeddingsFile: 'data/embeddings.json',
        threshold: 0.48,          // Max Euclidean Distance (lower is stricter, 0.48 is very strict)
        topK: 3,                  // Validate against average of top 3 closest matches
        scanInterval: 1500,       // ms between scans
        minConfidence: 0.5
    };

    // ── DOM References ─────────────────────────────────────
    const videoEl = document.getElementById('webcamVideo');
    const canvasEl = document.getElementById('overlayCanvas');
    const webcamOverlay = document.getElementById('webcamOverlay');
    const webcamContainer = document.getElementById('webcamContainer');
    const lockStatus = document.getElementById('lockStatus');
    const lockIcon = document.getElementById('lockIcon');
    const lockLabel = document.getElementById('lockLabel');
    const lockMessage = document.getElementById('lockMessage');
    const lockScore = document.getElementById('lockScore');
    const displaySimilarity = document.getElementById('displaySimilarity');
    const displaySamples = document.getElementById('displaySamples');
    const displayScans = document.getElementById('displayScans');
    const alertBox = document.getElementById('alertBox');

    // ── State ──────────────────────────────────────────────
    let referenceData = null;
    let scanCount = 0;
    let scanning = false;
    let scanTimer = null;

    // ── Initialization ─────────────────────────────────────
    async function init() {
        setStatus('idle', '⏳', 'LOADING', 'Loading face recognition models...');

        try {
            // 1. Load models
            await loadModels();

            // 2. Load reference embeddings
            await loadEmbeddings();

            // 3. Start webcam
            await startWebcam();

            // 4. Start continuous scanning
            setStatus('idle', '🔍', 'SCANNING', 'Looking for faces...');
            startAutoScan();

        } catch (err) {
            setStatus('locked', '❌', 'ERROR', err.message);
            showAlert(err.message, 'error');
        }
    }

    // ── Model Loading ──────────────────────────────────────
    async function loadModels() {
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js not loaded. Check your internet connection.');
        }

        await faceapi.nets.ssdMobilenetv1.loadFromUri(CONFIG.modelUrl);
        await faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.modelUrl);
        await faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.modelUrl);

        console.log('[FaceLock] Models loaded.');
    }

    // ── Load Embeddings ────────────────────────────────────
    async function loadEmbeddings() {
        setStatus('idle', '⏳', 'LOADING', 'Loading reference embeddings...');

        try {
            const resp = await fetch(CONFIG.embeddingsFile);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            if (!data.samples || !Array.isArray(data.samples) || data.samples.length === 0) {
                throw new Error('No embeddings found.');
            }

            referenceData = data;
            displaySamples.textContent = data.samples.length;
            console.log(`[FaceLock] Loaded ${data.samples.length} reference embeddings.`);

        } catch (err) {
            throw new Error(
                'Could not load embeddings. Run "node generate_embeddings.js" first to create the dataset.'
            );
        }
    }

    // ── Webcam ─────────────────────────────────────────────
    async function startWebcam() {
        setStatus('idle', '📷', 'CAMERA', 'Starting webcam...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false
            });

            videoEl.srcObject = stream;
            await videoEl.play();
            webcamOverlay.classList.add('hidden');

            console.log('[FaceLock] Webcam started.');
        } catch (err) {
            throw new Error('Camera access denied. Please allow camera access and reload.');
        }
    }

    // ── Auto-Scan Loop ─────────────────────────────────────
    function startAutoScan() {
        scanTimer = setInterval(performScan, CONFIG.scanInterval);
        // Also do first scan immediately
        performScan();
    }

    async function performScan() {
        if (scanning || !referenceData) return;
        scanning = true;

        try {
            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            if (canvas.width === 0 || canvas.height === 0) {
                scanning = false;
                return; // Video not ready yet
            }
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0);

            // Detect face
            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: CONFIG.minConfidence }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            scanCount++;
            displayScans.textContent = scanCount;

            if (!detection) {
                // Check for multiple faces
                const allFaces = await faceapi
                    .detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: CONFIG.minConfidence }));

                if (allFaces.length > 1) {
                    setStatus('locked', '🔒', 'LOCKED', 'Multiple faces detected');
                } else {
                    setStatus('idle', '🔍', 'SCANNING', 'No face detected — look at the camera');
                }
                displaySimilarity.textContent = '--';
                displaySimilarity.className = 'stat-value';
                scanning = false;
                return;
            }

            // Compare against reference embeddings (Euclidean Top-K)
            const scannedEmbedding = Array.from(detection.descriptor);
            const result = compareEmbeddings(scannedEmbedding, referenceData.samples);

            // Update display
            const simStr = result.simPercent.toFixed(1) + '%';
            displaySimilarity.textContent = simStr;

            if (result.match) {
                displaySimilarity.className = 'stat-value text-success';
                setStatus('unlocked', '🔓', 'UNLOCKED', 'Face recognized — Access granted');
                lockScore.textContent = simStr;
                lockScore.style.color = 'var(--success)';
            } else {
                displaySimilarity.className = 'stat-value text-danger';
                setStatus('locked', '🔒', 'LOCKED', 'Face not recognized — Access denied');
                lockScore.textContent = simStr;
                lockScore.style.color = 'var(--danger)';
            }

            // Draw face detection overlay
            drawDetection(detection);

        } catch (err) {
            console.warn('[FaceLock] Scan error:', err.message);
        }

        scanning = false;
    }

    // ── Advanced Similarity Calculation (Euclidean Top-K) ────
    function euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    function compareEmbeddings(scanned, samples) {
        if (!samples || samples.length === 0) return { match: false, simPercent: 0 };

        // 1. Calculate Euclidean distance to all reference samples
        const distances = samples.map(sample => euclideanDistance(scanned, sample.embedding));
        
        // 2. Sort distances ascending (lower distance = more similar)
        distances.sort((a, b) => a - b);

        // 3. Take Top K closest matches
        const k = Math.min(CONFIG.topK, distances.length);
        let sumDistance = 0;
        for (let i = 0; i < k; i++) {
            sumDistance += distances[i];
        }
        
        // 4. Calculate Average Distance of the Top K
        const avgDistance = sumDistance / k;

        // 5. Determine match based on strictly set distance threshold
        const match = avgDistance <= CONFIG.threshold;

        // Convert distance to a human-readable 0-100% similarity score.
        // A perfect match (dist=0) -> 100%. A total mismatch (dist>=1.0) -> 0%.
        let simPercent = Math.max(0, 1 - avgDistance) * 100;

        return {
            avgDistance,
            simPercent,
            match
        };
    }

    // ── Draw Detection Overlay ─────────────────────────────
    function drawDetection(detection) {
        const displaySize = { width: videoEl.videoWidth, height: videoEl.videoHeight };
        canvasEl.width = displaySize.width;
        canvasEl.height = displaySize.height;

        const ctx = canvasEl.getContext('2d');
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        // Draw face bounding box
        const box = detection.detection.box;
        const match = displaySimilarity.textContent !== '--' && lockStatus.classList.contains('unlocked');

        ctx.strokeStyle = match ? '#10b981' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Clear overlay after 1 second
        setTimeout(() => {
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        }, CONFIG.scanInterval - 200);
    }

    // ── UI Helpers ──────────────────────────────────────────
    function setStatus(state, icon, label, message) {
        lockStatus.className = `lock-status ${state}`;
        lockIcon.textContent = icon;
        lockLabel.textContent = label;
        lockMessage.textContent = message;
    }

    function showAlert(message, type) {
        const icons = { warning: '⚠️', error: '❌', info: 'ℹ️', success: '✅' };
        alertBox.className = `alert alert-${type}`;
        alertBox.innerHTML = `<span class="alert-icon">${icons[type] || 'ℹ️'}</span> ${message}`;
        alertBox.classList.remove('hidden');
    }

    // ── Start ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

})();
