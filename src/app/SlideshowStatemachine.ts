export const STATE_NEW = 'new';
export const STATE_HAS_IMAGES = 'loaded';
export const STATE_RUNNING = 'started';
export const STATE_PAUSED = 'paused';
export const STATE_STOPPED = 'stopped';
export const STATE_STOPPED_PAUSED = 'stopped_paused'

export const ACTION_LOAD = 'load';
export const ACTION_CLEAR = 'clear';
export const ACTION_START = 'start';
export const ACTION_STOP = 'stop';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESUME = 'resume';
export const ACTION_NEXT = 'next';
export const ACTION_PREVIOUS = 'previous';

export type SlideshowState =
  typeof STATE_NEW |
  typeof STATE_HAS_IMAGES |
  typeof STATE_RUNNING |
  typeof STATE_PAUSED |
  typeof STATE_STOPPED |
  typeof STATE_STOPPED_PAUSED;

export type SlideshowAction =
  typeof ACTION_LOAD |
  typeof ACTION_CLEAR |
  typeof ACTION_START |
  typeof ACTION_STOP |
  typeof ACTION_PAUSE |
  typeof ACTION_RESUME |
  typeof ACTION_PREVIOUS |
  typeof ACTION_NEXT;

export type SlideshowStateEffect = () => void;

export class SlideshowStatemachine {
private static readonly actions = new Map<SlideshowState, Map<SlideshowAction, SlideshowState>>([
    [STATE_NEW, new Map([
        [ACTION_LOAD, STATE_HAS_IMAGES],
    ])],
    [STATE_HAS_IMAGES, new Map([
        [ACTION_CLEAR, STATE_NEW],
        [ACTION_START, STATE_RUNNING],
        [ACTION_LOAD, STATE_HAS_IMAGES],
    ])],
    [STATE_RUNNING, new Map([
        [ACTION_STOP, STATE_STOPPED],
        [ACTION_PAUSE, STATE_PAUSED],
        [ACTION_PREVIOUS, STATE_RUNNING],
        [ACTION_NEXT, STATE_RUNNING],
    ])],
    [STATE_PAUSED, new Map([
        [ACTION_RESUME, STATE_RUNNING],
        [ACTION_STOP, STATE_STOPPED_PAUSED],
        [ACTION_NEXT, STATE_PAUSED],
        [ACTION_PREVIOUS, STATE_PAUSED],
    ])],
    [STATE_STOPPED, new Map([
        [ACTION_RESUME, STATE_RUNNING],
        [ACTION_START, STATE_RUNNING],
        [ACTION_CLEAR, STATE_NEW],
        [ACTION_LOAD, STATE_HAS_IMAGES],
    ])],
    [STATE_STOPPED_PAUSED, new Map([
        [ACTION_RESUME, STATE_PAUSED],
        [ACTION_CLEAR, STATE_NEW],
        [ACTION_LOAD, STATE_HAS_IMAGES],
        [ACTION_START, STATE_PAUSED]
    ])],
]);
  private state : SlideshowState = STATE_NEW;

  getState() : SlideshowState {
    return this.state;
  }

  performAction(action: SlideshowAction, effects: Map<SlideshowState, SlideshowStateEffect>) {
    const newState = SlideshowStatemachine.actions.get(this.state)?.get(action);
    if (!newState) {
        throw new Error(`Invalid action "${action}" for state "${this.state}"`);
    }
    this.state = newState;

    const effect = effects.get(this.state);
    if (effect) {
        effect();
    }
  }
}