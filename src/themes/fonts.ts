// Google Fonts, loaded once. Remotion waits for them before rendering a frame.
// French needs only the "latin" subset (é, è, à, ç, œ, « » are all in it).
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as loadPressStart} from '@remotion/google-fonts/PressStart2P';
import {loadFont as loadVT323} from '@remotion/google-fonts/VT323';

export const montserrat = loadMontserrat('normal', {
	weights: ['600', '700', '800', '900'],
	subsets: ['latin'],
}).fontFamily;

export const pressStart = loadPressStart('normal', {
	weights: ['400'],
	subsets: ['latin'],
}).fontFamily;

export const vt323 = loadVT323('normal', {
	weights: ['400'],
	subsets: ['latin'],
}).fontFamily;
