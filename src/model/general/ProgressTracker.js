class ProgressTracker {
    constructor(totalSteps) {
        this._currentStep = 0;
        this._totalSteps = totalSteps;
    };

    get totalSteps() {
        return this._totalSteps;
    };

    set totalSteps(steps) {
        this._totalSteps = steps;
    };

    step() {
        this._currentStep += 1;
    };

    format(message) {
        return {
            currentStep: this._currentStep,
            totalSteps: this._totalSteps,
            progress: (this._currentStep / this._totalSteps) * 100,
            message: `[${this._currentStep}/${this._totalSteps}]: ${message}`
        }
    };

    reset() {
        this._currentStep = 0;
    };
};

module.exports = ProgressTracker;