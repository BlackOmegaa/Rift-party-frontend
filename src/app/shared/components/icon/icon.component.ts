import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
	LucideArrowLeft,
	LucideBrush,
	LucideBug,
	LucideCaseSensitive,
	LucideCheck,
	LucideCircleCheck,
	LucideCircleQuestionMark,
	LucideCircleX,
	LucideCloudFog,
	LucideCrown,
	LucideDroplet,
	LucideEye,
	LucideFlame,
	LucideFlaskConical,
	LucideHandshake,
	LucideHeartHandshake,
	LucideList,
	LucideLoaderCircle,
	LucideLock,
	LucideLogOut,
	LucideMoon,
	LucidePawPrint,
	LucideRadio,
	LucideRotateCcw,
	LucideScale,
	LucideSearch,
	LucideSend,
	LucideSettings,
	LucideShield,
	LucideSkull,
	LucideSparkles,
	LucideSword,
	LucideTowerControl,
	LucideVenetianMask,
	LucideX,
	LucideZap,
} from '@lucide/angular';

export type IconName =
	| 'bug'
	| 'sword'
	| 'question'
	| 'flask'
	| 'tower'
	| 'list'
	| 'mask'
	| 'fog'
	| 'skull'
	| 'sparkle'
	| 'crown'
	| 'blood-drop'
	| 'moon'
	| 'scale'
	| 'handshake'
	| 'support'
	| 'paw'
	| 'candle'
	| 'letters'
	| 'comet'
	| 'shield'
	| 'radio'
	| 'search'
	| 'eye'
	| 'brush'
	| 'gear'
	| 'check'
	| 'check-circle'
	| 'x-circle'
	| 'send'
	| 'loader'
	| 'close'
	| 'back'
	| 'leave'
	| 'replay'
	| 'lock';

/**
 * Icone uniforme (jeu de traits Lucide, cf. https://lucide.dev) : plus de SVG
 * dessine a la main ni d'emoji, juste un wrapper autour des composants Lucide
 * individuels (tree-shakeable). `name` reste le seul point de contact avec le
 * reste de l'app : changer un mapping ci-dessous ne touche aucun appelant.
 */
@Component({
	selector: 'app-icon',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		LucideArrowLeft,
		LucideBrush,
		LucideBug,
		LucideCaseSensitive,
		LucideCheck,
		LucideCircleCheck,
		LucideCircleQuestionMark,
		LucideCircleX,
		LucideCloudFog,
		LucideCrown,
		LucideDroplet,
		LucideEye,
		LucideFlame,
		LucideFlaskConical,
		LucideHandshake,
		LucideHeartHandshake,
		LucideList,
		LucideLoaderCircle,
		LucideLock,
		LucideLogOut,
		LucideMoon,
		LucidePawPrint,
		LucideRadio,
		LucideRotateCcw,
		LucideScale,
		LucideSearch,
		LucideSend,
		LucideSettings,
		LucideShield,
		LucideSkull,
		LucideSparkles,
		LucideSword,
		LucideTowerControl,
		LucideVenetianMask,
		LucideX,
		LucideZap,
	],
	host: {
		'[class.spin]': "name() === 'loader'",
	},
	template: `
		@switch (name()) {
			@case ('bug') {
				<svg lucideBug [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('sword') {
				<svg lucideSword [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('question') {
				<svg lucideCircleQuestionMark [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('flask') {
				<svg lucideFlaskConical [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('tower') {
				<svg lucideTowerControl [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('list') {
				<svg lucideList [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('mask') {
				<svg lucideVenetianMask [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('fog') {
				<svg lucideCloudFog [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('skull') {
				<svg lucideSkull [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('sparkle') {
				<svg lucideSparkles [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('crown') {
				<svg lucideCrown [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('blood-drop') {
				<svg lucideDroplet [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('moon') {
				<svg lucideMoon [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('scale') {
				<svg lucideScale [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('handshake') {
				<svg lucideHandshake [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('support') {
				<svg lucideHeartHandshake [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('paw') {
				<svg lucidePawPrint [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('candle') {
				<svg lucideFlame [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('letters') {
				<svg lucideCaseSensitive [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('comet') {
				<svg lucideZap [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('shield') {
				<svg lucideShield [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('radio') {
				<svg lucideRadio [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('search') {
				<svg lucideSearch [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('eye') {
				<svg lucideEye [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('brush') {
				<svg lucideBrush [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('gear') {
				<svg lucideSettings [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('check') {
				<svg lucideCheck [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('check-circle') {
				<svg lucideCircleCheck [size]="size()" [strokeWidth]="2" />
			}
			@case ('x-circle') {
				<svg lucideCircleX [size]="size()" [strokeWidth]="2" />
			}
			@case ('send') {
				<svg lucideSend [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('loader') {
				<svg lucideLoaderCircle [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('close') {
				<svg lucideX [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('back') {
				<svg lucideArrowLeft [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('leave') {
				<svg lucideLogOut [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('replay') {
				<svg lucideRotateCcw [size]="size()" [strokeWidth]="1.6" />
			}
			@case ('lock') {
				<svg lucideLock [size]="size()" [strokeWidth]="1.6" />
			}
		}
	`,
	styles: [
		`
			:host {
				display: inline-flex;
				line-height: 0;
			}
			:host.spin {
				animation: app-icon-spin 1s linear infinite;
			}
			@keyframes app-icon-spin {
				to {
					transform: rotate(360deg);
				}
			}
		`,
	],
})
export class IconComponent {
	name = input.required<IconName>();
	size = input(20);
}
