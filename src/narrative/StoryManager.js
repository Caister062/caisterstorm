export class StoryManager {
    constructor(interactables) {
        this.interactables = interactables;
        this.collected = new Set();
        this.totalCollectibles = interactables.length;
    }

    collect(id) {
        this.collected.add(id);
    }

    getProgress() {
        return {
            found: this.collected.size,
            total: this.totalCollectibles,
        };
    }
}
