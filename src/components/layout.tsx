import React, {createContext, useContext, useMemo} from 'react';
import {useVideoConfig} from 'remotion';

export type Layout = {
	width: number;
	height: number;
	/** Scale factor: 1 at 1080px on the short side. Multiply every px size by it. */
	s: number;
	vertical: boolean;
	padX: number;
	/** Top of the scene area (below the platform's top UI). */
	top: number;
	/** Bottom of the scene area (above the captions). */
	bottom: number;
	contentWidth: number;
	contentHeight: number;
	/** Top of the captions band. */
	captionsTop: number;
	/** Bottom of the captions band (keep platform UI clear below it). */
	captionsBottom: number;
	assetBase: string;
};

const LayoutContext = createContext<Layout | null>(null);

export const LayoutProvider: React.FC<{
	captions: boolean;
	assetBase: string;
	children: React.ReactNode;
}> = ({captions, assetBase, children}) => {
	const {width, height} = useVideoConfig();
	const value = useMemo<Layout>(() => {
		const vertical = height > width * 1.2;
		const s = Math.min(width, height) / 1080;
		const padX = Math.round((vertical ? 80 : 120) * s);
		// Vertical shorts: keep ~12% at the top and ~20% at the bottom free for app UI.
		const top = Math.round(height * (vertical ? 0.12 : 0.08));
		const captionsTop = Math.round(height * (vertical ? 0.7 : 0.8));
		const captionsBottom = Math.round(height * (vertical ? 0.8 : 0.95));
		const bottom = captions ? captionsTop - Math.round(30 * s) : Math.round(height * (vertical ? 0.8 : 0.92));
		return {
			width,
			height,
			s,
			vertical,
			padX,
			top,
			bottom,
			contentWidth: width - padX * 2,
			contentHeight: bottom - top,
			captionsTop,
			captionsBottom,
			assetBase,
		};
	}, [width, height, captions, assetBase]);
	return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = (): Layout => {
	const l = useContext(LayoutContext);
	if (!l) throw new Error('useLayout() must be used inside <LayoutProvider>');
	return l;
};

/** The safe area where scenes draw: below the top UI, above the captions. */
export const ContentArea: React.FC<{
	children: React.ReactNode;
	justify?: React.CSSProperties['justifyContent'];
	gap?: number;
}> = ({children, justify = 'center', gap = 40}) => {
	const l = useLayout();
	return (
		<div
			style={{
				position: 'absolute',
				left: l.padX,
				right: l.padX,
				top: l.top,
				height: l.contentHeight,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: justify,
				alignItems: 'stretch',
				gap: gap * l.s,
			}}
		>
			{children}
		</div>
	);
};
