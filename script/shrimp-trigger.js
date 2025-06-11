// script/shrimp-trigger.js

// --- Configuration Variables for Mouth Detection (ปรับจูนค่าเหล่านี้) ---
const MOUTH_OPEN_THRESHOLD = 15; // Threshold สำหรับการอ้าปาก
let lastMouthState = null; // Stores the last detected mouth state: null, "OPEN", "CLOSED"

// --- Face API Setup ---
let faceApiVideoElement = null; // Reference to the video element used by MindAR
let faceApiModelsLoaded = false; // Flag to indicate if face-api.js models are loaded
let faceApiDetectionInterval = null; // Interval ID for the detection loop

/**
 * Loads the required models for face-api.js.
 * Ensure the MODEL_URL path is correct and accessible.
 */
async function loadFaceApiModels() {
  // IMPORTANT: Verify this path is correct for your project structure.
  // Example: If 'public' folder is at the root, and 'models' is inside 'public'.
  const MODEL_URL = "./public/models";

  console.log("Face API: Loading models from:", MODEL_URL);
  try {
    // Load the SsdMobilenetv1 model for face detection
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    // Load the FaceLandmark68Net model for detecting facial landmarks
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    console.log("Face API: Models loaded successfully.");
    faceApiModelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Face API: Error loading models: ", error);
    console.error(
      `Face API: Failed to load models from ${MODEL_URL}. Please check the path and ensure model files (like .json and .weights/.bin) are present and accessible.`
    );
    // Optionally, inform the user via an alert or UI message
    // alert("Critical error: AI models for face interaction could not be loaded. Please check the console for details.");
    faceApiModelsLoaded = false;
    return false;
  }
}

/**
 * Detects mouth state (open/closed) using face-api.js and controls the visibility
 * of the chopstick and shrimp models.
 */
async function detectMouthState() {
  // Exit if models aren't loaded, video isn't ready, or video is paused/ended
  if (
    !faceApiModelsLoaded ||
    !faceApiVideoElement ||
    faceApiVideoElement.paused ||
    faceApiVideoElement.ended ||
    faceApiVideoElement.readyState < 2
  ) {
    // readyState < 2 means video doesn't have enough data (HAVE_NOTHING or HAVE_METADATA)
    return; // Will be called again by the interval
  }

  // Perform face detection with landmarks
  const detections = await faceapi
    .detectAllFaces(
      faceApiVideoElement,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
    ) // Adjust minConfidence if needed
    .withFaceLandmarks();

  let currentMouthState = "CLOSED"; // Default to closed

  if (detections && detections.length > 0) {
    // Use the first detected face
    const landmarks = detections[0].landmarks;

    // Get Y-coordinates of inner lip landmarks (points 62 and 66 from the 68-point model)
    const innerLipTopY = landmarks.positions[62].y;
    const innerLipBottomY = landmarks.positions[66].y;

    // Calculate the vertical distance between inner lips
    const mouthOpening = Math.abs(innerLipBottomY - innerLipTopY);

    // For debugging: console.log("Face API: Mouth Opening Value:", mouthOpening.toFixed(2));

    if (mouthOpening > MOUTH_OPEN_THRESHOLD) {
      currentMouthState = "OPEN";
    }
  } else {
    // No face detected by face-api.js, assume mouth is closed for model visibility
    currentMouthState = "CLOSED";
  }

  // Only update A-Frame models if the mouth state has changed
  if (currentMouthState !== lastMouthState) {
    console.log("Face API: Mouth State Changed To:", currentMouthState);
    lastMouthState = currentMouthState;

    // Get references to the A-Frame models
    const chopstickModel = document.querySelector("#chopstickModel");
    const shrimpModel = document.querySelector("#shrimpModelEntity");

    if (chopstickModel && shrimpModel) {
      const shouldBeVisible = currentMouthState === "OPEN";
      chopstickModel.setAttribute("visible", shouldBeVisible);
      shrimpModel.setAttribute("visible", shouldBeVisible);

      if (shouldBeVisible) {
        console.log(
          "A-Frame: Chopstick and Shrimp set to VISIBLE (mouth open)"
        );
      } else {
        console.log(
          "A-Frame: Chopstick and Shrimp set to HIDDEN (mouth closed / no face)"
        );
      }
    } else {
      if (!chopstickModel)
        console.warn(
          "A-Frame: chopstickModel (#chopstickModel) could not be found in the scene!"
        );
      if (!shrimpModel)
        console.warn(
          "A-Frame: shrimpModelEntity (#shrimpModelEntity) could not be found in the scene!"
        );
    }
  }
}

// Register the A-Frame component
AFRAME.registerComponent("shrimp-trigger", {
  // Component schema (properties that can be set from HTML)
  schema: {
    // Example: detectionInterval: {type: 'number', default: 150}
  },

  /**
   * Called once when the component is initialized.
   * Sets up Face API model loading and video element acquisition.
   */
  init: function () {
    console.log("Shrimp Trigger Component: Initializing...");
    // const el = this.el; // The A-Frame entity this component is attached to
    // const sceneEl = this.el.sceneEl; // The A-Frame scene element

    // Load Face API models and then set up video processing
    loadFaceApiModels()
      .then((loadedSuccessfully) => {
        if (loadedSuccessfully) {
          this.setupFaceApiWithMindARVideo();
        } else {
          console.error(
            "Shrimp Trigger Component: Face API models failed to load. Mouth-controlled interactions will be disabled."
          );
        }
      })
      .catch((error) => {
        console.error(
          "Shrimp Trigger Component: An error occurred during the Face API model loading promise:",
          error
        );
      });

    console.log("Shrimp Trigger Component: Initialization process started.");
  },

  /**
   * Tries to find the video element used by MindAR.
   * This is crucial for face-api.js to process the correct video stream.
   */
  setupFaceApiWithMindARVideo: function () {
    const sceneEl = this.el.sceneEl;

    const attemptToGetVideo = () => {
      // Preferred method: Access video through MindAR's system (if available and exposed)
      const mindARSystem = sceneEl.systems["mindar-face-system"];
      if (mindARSystem && mindARSystem.video) {
        faceApiVideoElement = mindARSystem.video;
        console.log(
          "Face API: MindAR video element successfully found via system reference:",
          faceApiVideoElement
        );
        this.startFaceApiDetectionLoop();
        return; // Video found, exit
      }

      // Fallback method: Query the DOM for video elements
      // This might be less reliable as it could pick up other videos on the page.
      const videosInDocument = document.querySelectorAll("video");
      for (let video of videosInDocument) {
        // Heuristics to identify the MindAR video:
        // - It has an active srcObject (camera stream).
        // - It's visible and has dimensions (not a hidden utility video).
        // - Avoid picking up a video with a known ID that isn't the MindAR one.
        if (
          video.srcObject &&
          video.srcObject.active &&
          video.offsetHeight > 0 &&
          video.offsetWidth > 0
        ) {
          if (!video.id || video.id !== "anyOtherKnownVideoIdOnPage") {
            // Adjust if you have other specific video IDs
            faceApiVideoElement = video;
            console.log(
              "Face API: Found a potential MindAR video element via DOM query:",
              faceApiVideoElement
            );
            this.startFaceApiDetectionLoop();
            return; // Video found, exit
          }
        }
      }

      // If video not found yet, schedule another attempt
      console.log(
        "Face API: MindAR video element not found yet. Will retry shortly..."
      );
      setTimeout(attemptToGetVideo, 1000); // Retry after 1 second
    };

    // Wait for the A-Frame scene to be fully loaded before trying to get the video,
    // as MindAR system might not be ready immediately.
    if (sceneEl.hasLoaded) {
      console.log(
        "Face API: A-Frame scene is already loaded. Attempting to get MindAR video element."
      );
      attemptToGetVideo();
    } else {
      console.log(
        "Face API: Waiting for A-Frame scene to load before attempting to get MindAR video element..."
      );
      sceneEl.addEventListener(
        "loaded",
        () => {
          console.log(
            "Face API: A-Frame scene is now loaded. Attempting to get MindAR video element."
          );
          attemptToGetVideo();
        },
        { once: true }
      ); // Ensure this listener runs only once
    }
  },

  /**
   * Starts the interval-based loop for detecting mouth state.
   */
  startFaceApiDetectionLoop: function () {
    if (!faceApiVideoElement) {
      console.error(
        "Face API: Cannot start detection loop because the MindAR video element is missing."
      );
      return;
    }

    // Clear any existing interval to prevent multiple loops
    if (faceApiDetectionInterval) {
      clearInterval(faceApiDetectionInterval);
    }

    const checkVideoAndRunDetection = () => {
      if (faceApiVideoElement.readyState >= 2) {
        // HAVE_CURRENT_DATA or more
        // Video is ready for processing
        // console.log("Face API: Video is ready. Running detection."); // Can be verbose
        detectMouthState(); // Run detection now

        // If the interval was for checking readiness, clear it and set the main detection interval
        if (faceApiDetectionInterval && this.isCheckingReadinessInterval) {
          clearInterval(faceApiDetectionInterval);
          this.isCheckingReadinessInterval = false;
          faceApiDetectionInterval = setInterval(detectMouthState, 150); // Detection interval (e.g., ~6-7 FPS)
        } else if (!this.isCheckingReadinessInterval) {
          // If it's the main detection interval already running
          // It will just continue
        }
      } else {
        // Video not ready yet, wait for the interval to call this again
        // console.log("Face API: Video not ready yet (readyState:", faceApiVideoElement.readyState,"). Waiting for interval.");
      }
    };

    // Listen for video readiness events as a primary way to start
    // This is often more reliable than just polling with setInterval from the start.
    let eventsAttached = false;
    const onVideoReady = () => {
      if (eventsAttached) {
        // Prevent multiple calls if both events fire
        faceApiVideoElement.removeEventListener("canplay", onVideoReady);
        faceApiVideoElement.removeEventListener("loadeddata", onVideoReady);
      }
      eventsAttached = true; // Mark that an event has fired
      console.log(
        "Face API: Video 'canplay' or 'loadeddata' event fired. Setting up main detection interval."
      );
      if (faceApiDetectionInterval) clearInterval(faceApiDetectionInterval); // Clear any polling interval
      this.isCheckingReadinessInterval = false;
      detectMouthState(); // Run once immediately
      faceApiDetectionInterval = setInterval(detectMouthState, 150); // Adjust interval as needed (milliseconds)
    };

    if (faceApiVideoElement.readyState >= 2) {
      // Video already ready
      console.log(
        "Face API: Video element was already ready. Setting up main detection interval."
      );
      if (faceApiDetectionInterval) clearInterval(faceApiDetectionInterval);
      this.isCheckingReadinessInterval = false;
      detectMouthState(); // Run once immediately
      faceApiDetectionInterval = setInterval(detectMouthState, 150);
    } else {
      // Video not ready, attach event listeners and start a polling interval as a fallback
      console.log(
        "Face API: Video not ready. Attaching readiness event listeners and starting polling interval."
      );
      faceApiVideoElement.addEventListener("canplay", onVideoReady, {
        once: true,
      });
      faceApiVideoElement.addEventListener("loadeddata", onVideoReady, {
        once: true,
      });

      // Fallback polling interval in case events don't fire reliably or are missed
      if (faceApiDetectionInterval) clearInterval(faceApiDetectionInterval);
      this.isCheckingReadinessInterval = true; // Mark this interval as for checking readiness
      faceApiDetectionInterval = setInterval(checkVideoAndRunDetection, 250); // Poll for readiness
    }

    console.log("Face API: Detection loop setup process initiated.");
  },

  /**
   * Called when the component is removed from the entity or the entity is removed.
   * Cleans up the detection interval.
   */
  remove: function () {
    console.log("Shrimp Trigger Component: Removing...");
    if (faceApiDetectionInterval) {
      clearInterval(faceApiDetectionInterval);
      faceApiDetectionInterval = null;
      console.log("Face API: Detection interval cleared successfully.");
    }
    // Any other cleanup (e.g., removing event listeners if they weren't {once: true})
  },
});
