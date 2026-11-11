/** Shared numbers for the 2D game. Distances are in pixels, time in seconds. */
export const TILE = 16;

/** Internal resolution: 25 × 14 tiles. The canvas is scaled up with crisp pixels. */
export const VIEW_W = 400;
export const VIEW_H = 224;

export const LEVEL_ROWS = 14;
/** The two bottom rows of every chunk are ground (unless a pit is cut into them). */
export const GROUND_ROWS = 2;

export const STEP = 1 / 60;

export const GRAVITY = 1400;
export const MAX_FALL = 430;
export const RUN_SPEED = 112;
export const RUN_ACCEL = 900;
export const RUN_FRICTION = 1100;
export const AIR_CONTROL = 0.75;
export const JUMP_SPEED = 385;
/** Releasing jump early caps the upward speed, giving short hops. */
export const JUMP_CUT_SPEED = 130;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER = 0.12;
export const STOMP_BOUNCE = 250;

export const PLAYER_W = 10;
export const PLAYER_H = 14;
export const ENEMY_W = 12;
export const ENEMY_H = 9;
export const ENEMY_SPEED = 26;

export const MAX_HEARTS = 3;
export const INVULN_TIME = 1.4;
export const LAUNCH_TIME = 2.4;
