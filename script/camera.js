/* === UI Controller === */
document.addEventListener("DOMContentLoaded", () => {
  const sceneEl = document.querySelector("#myScene");
  console.log("A-Frame Scene Element:", sceneEl);

  const photoButton = document.getElementById("photoButton");
  const toggleInput = document.getElementById("toggleInput"); // Switch Camera/Video mode
  const circle = document.querySelector(".circle");
  const ring = document.querySelector(".ring");
  const previewModal = document.getElementById("previewModal");
  const previewImage = document.getElementById("previewImage"); // Assume this exists for image preview
  // const previewVideo = document.getElementById("previewVideo"); // ไม่ต้องประกาศตรงนี้แล้ว เพราะจะสร้าง dynamic
  const closePreview = document.getElementById("closePreview");
  const shareImage = document.getElementById("shareImage");
  const switchButton = document.getElementById("switchButton"); // Get switch button element

  // --- เพิ่ม Element ที่เกี่ยวข้องกับการย้อนกลับ ---
  const bottomOverlay = document.querySelector(".bottom-overlay");
  const cameraControls = document.getElementById("cameraControls");
  // --- สิ้นสุดการเพิ่ม Element ---

  let isVideoMode = false;
  let isRecording = false;
  let mediaRecorder;
  let recordedChunks = [];

  // --- ตรวจสอบว่า Element ที่จำเป็นทั้งหมดมีอยู่จริง ---
  if (
    !sceneEl ||
    !photoButton ||
    !toggleInput ||
    !circle ||
    !ring ||
    !previewModal ||
    !previewImage ||
    !closePreview ||
    !shareImage ||
    !switchButton ||
    !bottomOverlay ||
    !cameraControls
  ) {
    console.error(
      "One or more essential UI elements could not be found. Please check IDs and HTML structure."
    );
    // Optionally, disable functionality or show an error message
    return; // Stop execution if critical elements are missing
  }
  // --- สิ้นสุดการตรวจสอบ ---

  /* === Capture Image Function === */
  const captureAFrameCombined = () => {
    const renderer = sceneEl.renderer;
    const renderCanvas = renderer.domElement;

    if (!renderCanvas) {
      console.error("A-Frame Canvas not found.");
      return;
    }

    const videoEl = document.querySelector("video");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
      canvas.width = 1280; // กำหนดความกว้างสำหรับแนวนอน
      canvas.height = 720; // กำหนดความสูงสำหรับอัตราส่วน 16:9
    } else {
      canvas.width = 720; // กำหนดความกว้างสำหรับแนวตั้ง
      canvas.height = 1280; // กำหนดความสูงสำหรับอัตราส่วน 9:16
    }

    requestAnimationFrame(() => {
      if (videoEl) {
        context.save(); // บันทึก state ก่อนกลับด้านสำหรับ videoEl
        context.translate(canvas.width, 0);
        context.scale(-1, 1); // กลับด้านเฉพาะการวาด videoEl
        // ปรับขนาดวิดีโอให้ตรงกับ canvas โดยคำนวณอัตราส่วนที่ถูกต้อง
        const sourceWidth = videoEl.videoWidth;
        const sourceHeight = videoEl.videoHeight;
        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = canvas.width / canvas.height;

        let drawWidth, drawHeight;
        if (sourceRatio > targetRatio) {
          drawHeight = canvas.height;
          drawWidth = drawHeight * sourceRatio;
        } else {
          drawWidth = canvas.width;
          drawHeight = drawWidth / sourceRatio;
        }

        const offsetX = (canvas.width - drawWidth) / 2;
        const offsetY = (canvas.height - drawHeight) / 2;

        context.drawImage(videoEl, offsetX, offsetY, drawWidth, drawHeight);
        context.restore();
      }

      context.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);

      const data = canvas.toDataURL("image/png");

      previewImage.src = data; // Set path to the captured image
      previewModal.style.display = "flex";
      previewImage.style.display = "block"; // Ensure image is visible
      bottomOverlay.style.display = "none";
      toggleUIVisibility(false); // Pass the specific elements to hide
    });
  };

  /* === Video Record Function === */
  const startVideoRecording = () => {
    const renderer = sceneEl.renderer;
    const renderCanvas = renderer.domElement;
    const videoEl = document.querySelector("video");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const isLandscape = window.innerWidth > window.innerHeight;

    canvas.width = isLandscape ? 1280 : 720;
    canvas.height = isLandscape ? 720 : 1280;

    const stream = canvas.captureStream(30); // 30 FPS
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/mp4; codecs=avc1.42E01E,mp4a.40.2",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      previewVideo.src = url;
      previewModal.style.display = "flex";
      recordedChunks = []; // Reset chunks for new recordings
    };

    mediaRecorder.start();

    const drawVideo = () => {
      if (videoEl) {
        context.save(); // บันทึก state ก่อนกลับด้านสำหรับ videoEl
        context.translate(canvas.width, 0);
        context.scale(-1, 1); // กลับด้านเฉพาะการวาด videoEl

        const sourceWidth = videoEl.videoWidth;
        const sourceHeight = videoEl.videoHeight;
        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = canvas.width / canvas.height;

        let drawWidth, drawHeight;
        if (sourceRatio > targetRatio) {
          drawHeight = canvas.height;
          drawWidth = drawHeight * sourceRatio;
        } else {
          drawWidth = canvas.width;
          drawHeight = drawWidth / sourceRatio;
        }

        const offsetX = (canvas.width - drawWidth) / 2;
        const offsetY = (canvas.height - drawHeight) / 2;

        context.drawImage(videoEl, offsetX, offsetY, drawWidth, drawHeight);
        context.restore(); // คืนค่า context กลับเป็นปกติ (ไม่กลับด้านแล้ว)
      }

      context.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);

      requestAnimationFrame(drawVideo);
    };

    drawVideo();

    const switchButton = document.getElementById("switchButton");
    if (switchButton) switchButton.style.display = "none";
    circle.classList.add("recording");
    ring.classList.add("recording");
  };

  // =================== แก้ไขฟังก์ชันนี้ ===================
  const stopVideoRecording = () => {
    mediaRecorder.stop();

    // Finalize recording
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      toggleUIVisibility(true);
      circle.classList.remove("recording");
      ring.classList.remove("recording");

      // แสดงปุ่ม switch อีกครั้ง
      switchButton.style.display = "block";

      // ค้นหา preview-content-wrapper ที่จะใส่ video ลงไป
      let previewContentWrapper = document.querySelector(
        "#previewModal .preview-content-wrapper"
      );
      if (!previewContentWrapper) {
        console.error("Preview content wrapper not found!");
        return;
      }

      // ค้นหาหรือสร้าง element video สำหรับ preview
      let previewVideo = document.getElementById("previewVideo");
      if (!previewVideo) {
        // สร้าง video element ใหม่
        previewVideo = document.createElement("video");
        previewVideo.id = "previewVideo";
        previewVideo.controls = false;
        previewVideo.autoplay = true;
        previewVideo.loop = true;
        previewVideo.style.cssText =
          "max-width: 100%; border: 3px solid white; border-radius: 8px; display: block;";

        // เพิ่ม video element ลงใน preview-content-wrapper
        previewContentWrapper.appendChild(previewVideo);
      }

      // กำหนด source ให้กับ video และแสดง modal
      previewVideo.src = url;
      previewModal.style.display = "flex";
      bottomOverlay.style.display = "none";

      // ซ่อน image preview ถ้ามีอยู่
      if (previewImage) {
        previewImage.style.display = "none";
      }

      // Reset chunks สำหรับการบันทึกครั้งต่อไป
      recordedChunks = [];
    };
  };
  // =================== สิ้นสุดการแก้ไข ===================

  // กำหนดฟังก์ชันเริ่มต้นของปุ่มถ่ายภาพ (จะถูก override โดย toggle)
  photoButton.onclick = captureAFrameCombined;

  // ฟังก์ชันสำหรับการเปลี่ยนแปลงโหมด
  toggleInput.addEventListener("change", () => {
    isVideoMode = toggleInput.checked;
    if (isVideoMode) {
      circle.style.backgroundImage =
        "linear-gradient(145deg, #ff5252, #d50000)";
      ring.style.animation = "pulse 2s infinite";
      photoButton.onclick = () => {
        if (!isRecording) {
          startVideoRecording();
          isRecording = true;
        } else {
          stopVideoRecording();
          isRecording = false;
        }
      };
    } else {
      circle.style.backgroundImage =
        "linear-gradient(145deg, #ffffff, #ffffff)";
      ring.style.animation = "none";
      photoButton.onclick = captureAFrameCombined;
    }
  });

  // ฟังก์ชันซ่อน UI กล้อง
  const toggleUIVisibility = (isVisible) => {
    const uiElements = [photoButton, switchButton]; // เพิ่ม ID สลับโหมดถ้าจำเป็น
    uiElements.forEach((el) => {
      el.style.display = isVisible ? "block" : "none";
    });
  };

  // =================== แก้ไขฟังก์ชันนี้ ===================
  // ปุ่มปิดหน้าต่างพรีวิว
  closePreview.addEventListener("click", () => {
    previewModal.style.display = "none";
    previewImage.style.display = "none"; // ซ่อนการแสดงผลรูปภาพ

    // หยุดและลบ video preview ถ้ามีอยู่
    let previewVideo = document.getElementById("previewVideo");
    if (previewVideo) {
      previewVideo.pause(); // หยุดการเล่น
      previewVideo.src = ""; // ปล่อยทรัพยากร

      // ลบออกจาก DOM
      if (previewVideo.parentNode) {
        previewVideo.parentNode.removeChild(previewVideo);
      }
    }

    bottomOverlay.style.display = "flex";
    toggleUIVisibility(true); // แสดง UI กล้องหลักอีกครั้ง
  });
  // =================== สิ้นสุดการแก้ไข ===================

  // ปุ่มแชร์
  shareImage.addEventListener("click", async () => {
    // Make async for await fetch
    let blob = null;
    let filename = "shared_content";
    let fileType = "application/octet-stream"; // Default type

    const currentPreviewVideo = document.getElementById("previewVideo");
    const isVideoPreviewActive =
      currentPreviewVideo &&
      currentPreviewVideo.src &&
      previewModal.style.display === "flex";

    try {
      if (isVideoPreviewActive) {
        filename = "video.mp4"; // Adjust extension based on recording mimeType
        fileType = "video/mp4"; // Adjust type
        // Fetch the blob from the Blob URL
        const response = await fetch(currentPreviewVideo.src);
        if (!response.ok) throw new Error("Failed to fetch video blob");
        blob = await response.blob();
      } else if (
        previewImage.src &&
        previewImage.style.display !== "none" &&
        previewModal.style.display === "flex"
      ) {
        filename = "image.png";
        fileType = "image/png";
        // Convert Data URL to Blob
        const response = await fetch(previewImage.src);
        if (!response.ok) throw new Error("Failed to fetch image blob");
        blob = await response.blob();
      } else {
        console.warn("No active preview found to share.");
        return; // Exit if nothing to share
      }

      if (!blob) {
        console.error("Could not get Blob data for sharing.");
        return;
      }

      const file = new File([blob], filename, { type: fileType });
      const shareData = {
        files: [file],
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log("Share successful");
      } else {
        // Fallback or error message
        alert(
          "Sharing files is not supported on this browser, or this file type cannot be shared."
        );
        console.error("navigator.canShare returned false or threw an error.");
      }
    } catch (error) {
      console.error("Error sharing content:", error);
      alert(`Sharing failed: ${error.message}`);
    }
  });

  // --- สิ้นสุดการเพิ่ม Event Listener ---

  // =================== แก้ไขฟังก์ชันนี้ ===================
  // Helper function to remove the video preview element
  function removePreviewVideoElement() {
    let previewVideo = document.getElementById("previewVideo");
    if (previewVideo && previewVideo.parentNode) {
      previewVideo.pause();
      previewVideo.src = "";
      previewVideo.parentNode.removeChild(previewVideo);
    }
  }
  // =================== สิ้นสุดการแก้ไข ===================
}); // End of DOMContentLoaded listener
