/**
 * Face Lock — Embedding Generator (Node.js)
 *
 * Crawls all images in dataset/owner/, detects faces,
 * generates 128-dim embeddings, and saves to data/embeddings.json.
 *
 * Usage:
 *   npm install
 *   node generate_embeddings.js
 *
 * Or specify a custom folder:
 *   node generate_embeddings.js path/to/photos
 */

const path = require('path');
const fs = require('fs');

async function main() {
    // Lazy-load heavy dependencies so errors are clear
    let faceapi, canvas, tf;

    try {
        canvas = require('canvas');
        tf = require('@tensorflow/tfjs');
        
        // MOCK: face-api.js node build hardcodes require('@tensorflow/tfjs-node'). 
        // Since we don't want to force C++ compilation, we hijack the require call to return pure JS tf.
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        Module.prototype.require = function(id) {
            if (id === '@tensorflow/tfjs-node') return require('@tensorflow/tfjs');
            return originalRequire.apply(this, arguments);
        };

        faceapi = require('@vladmandic/face-api');
    } catch (err) {
        console.error('❌ Failed to load dependencies:', err);
        process.exit(1);
    }

    // Monkey-patch browser APIs for Node.js
    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    // ── Configuration ──────────────────────────────────────
    const imageDir = process.argv[2] || path.join(__dirname, 'dataset', 'owner');
    const modelDir = path.join(__dirname, 'models');
    const outputDir = path.join(__dirname, 'data');
    const outputFile = path.join(outputDir, 'embeddings.json');

    const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

    // ── Validate paths ─────────────────────────────────────
    if (!fs.existsSync(imageDir)) {
        console.error(`❌ Image directory not found: ${imageDir}`);
        console.error('   Place face images in dataset/owner/ or specify a path.');
        process.exit(1);
    }

    if (!fs.existsSync(modelDir)) {
        console.error(`❌ Models directory not found: ${modelDir}`);
        console.error('   Run: powershell -ExecutionPolicy Bypass -File download_models.ps1');
        process.exit(1);
    }

    // ── Find images ────────────────────────────────────────
    const files = fs.readdirSync(imageDir)
        .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
        .sort();

    if (files.length === 0) {
        console.error(`❌ No images found in: ${imageDir}`);
        console.error('   Supported formats: JPG, PNG, WebP, BMP');
        process.exit(1);
    }

    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   Face Lock — Embedding Generator            ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log();
    console.log(`📁 Image folder : ${imageDir}`);
    console.log(`📸 Images found : ${files.length}`);
    console.log(`🧠 Models       : ${modelDir}`);
    console.log(`💾 Output       : ${outputFile}`);
    console.log();

    // ── Load models ────────────────────────────────────────
    console.log('⏳ Loading face detection models...');

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir);
    console.log('   ✅ SSD MobileNet v1 (face detection)');

    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir);
    console.log('   ✅ Face Landmark 68');

    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir);
    console.log('   ✅ Face Recognition Net');
    console.log();

    // ── Process images ─────────────────────────────────────
    console.log('🔄 Processing images...');
    console.log('─'.repeat(50));

    const samples = [];
    let noFace = 0;
    let multiFace = 0;
    let errors = 0;

    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        const filePath = path.join(imageDir, fileName);
        const sampleId = path.basename(fileName, path.extname(fileName));
        const progress = `[${String(i + 1).padStart(3)}/${files.length}]`;

        try {
            // Load image using canvas
            const img = await canvas.loadImage(filePath);

            // Detect all faces
            const detections = await faceapi
                .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 0) {
                console.log(`${progress} ❌ ${fileName} → NO FACE DETECTED`);
                noFace++;
            } else if (detections.length > 1) {
                console.log(`${progress} ⚠️  ${fileName} → ${detections.length} FACES (skipped)`);
                multiFace++;
            } else {
                // Exactly one face — save embedding
                const embedding = Array.from(detections[0].descriptor);
                samples.push({ id: sampleId, embedding });
                console.log(`${progress} ✅ ${fileName} → SUCCESS`);
            }
        } catch (err) {
            console.log(`${progress} ❌ ${fileName} → ERROR: ${err.message}`);
            errors++;
        }
    }

    // ── Results ────────────────────────────────────────────
    console.log('─'.repeat(50));
    console.log();
    console.log('📊 Results:');
    console.log(`   Total images   : ${files.length}`);
    console.log(`   ✅ Success      : ${samples.length}`);
    console.log(`   ❌ No face      : ${noFace}`);
    console.log(`   ⚠️  Multi face  : ${multiFace}`);
    console.log(`   ❌ Errors       : ${errors}`);
    console.log();

    if (samples.length === 0) {
        console.error('❌ No valid embeddings generated. Nothing to save.');
        process.exit(1);
    }

    // ── Save output ────────────────────────────────────────
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = {
        person: 'owner',
        samples: samples,
        created_at: new Date().toISOString(),
        total_samples: samples.length
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 4), 'utf8');

    console.log(`💾 Saved ${samples.length} embeddings to: ${outputFile}`);
    console.log();
    console.log('✅ Done! You can now open the web page to use face recognition.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
