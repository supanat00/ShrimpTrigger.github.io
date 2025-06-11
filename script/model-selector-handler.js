// script/model-selector-handler.js
AFRAME.registerComponent("model-selector-handler", {
  init: function () {
    // this.el is the <a-entity mindar-face-target>
    // Find the bowl model by its new ID, which is a child of this.el
    this.bowlModelEl = this.el.querySelector("#currentBowl"); // <<< CHANGED ID
    this.modelSelectorButtons = document.querySelectorAll(
      ".model-select-button"
    );

    if (!this.bowlModelEl) {
      console.error(
        "Model Selector Handler: Bowl model element ('#currentBowl') not found as a child of this entity."
      );
      return;
    }

    if (this.modelSelectorButtons.length === 0) {
      console.warn(
        "Model Selector Handler: No model selector buttons found with class '.model-select-button'."
      );
      return;
    }

    this.modelSelectorButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const modelAssetId = button.getAttribute("data-model-src");
        if (modelAssetId && this.bowlModelEl) {
          // Check bowlModelEl again
          this.bowlModelEl.setAttribute("src", modelAssetId);
          console.log(`Bowl model src set to: ${modelAssetId}`);

          this.modelSelectorButtons.forEach((btn) =>
            btn.classList.remove("active")
          );
          button.classList.add("active");
        } else {
          console.warn(
            "Clicked button is missing 'data-model-src' attribute or bowl model not found.",
            button
          );
        }
      });
    });

    this.setInitialActiveButtonAndModel();
    console.log("Model Selector Handler initialized.");
  },

  setInitialActiveButtonAndModel: function () {
    if (!this.bowlModelEl) return; // Guard if bowl not found

    const initialBowlSrc = this.bowlModelEl.getAttribute("src");
    let initialButtonActivated = false;

    if (initialBowlSrc) {
      this.modelSelectorButtons.forEach((button) => {
        if (button.getAttribute("data-model-src") === initialBowlSrc) {
          button.classList.add("active");
          initialButtonActivated = true;
        } else {
          button.classList.remove("active"); // Ensure others are not active
        }
      });
    }

    if (!initialButtonActivated && this.modelSelectorButtons.length > 0) {
      const firstButton = this.modelSelectorButtons[0];
      const firstButtonSrc = firstButton.getAttribute("data-model-src");
      if (firstButtonSrc) {
        this.bowlModelEl.setAttribute("src", firstButtonSrc);
        firstButton.classList.add("active");
        console.log(
          `Initial bowl model src (from first button) set to: ${firstButtonSrc}`
        );
      }
    }
  },
});
