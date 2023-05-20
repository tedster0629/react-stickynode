//#region Global imports
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { subscribe } from 'subscribe-ui-event';
import classNames from 'classnames';
import shallowEqual from 'shallowequal';
//#endregion Global imports

const propTypes = {
	/** A switch to enable or disable Sticky (true by default). */
	enabled: PropTypes.bool,
	/**
	 * A top offset px for Sticky. Could be a selector representing a node whose height should serve as the top offset.
	 * The value will be add on translate3d(0,top,0) property.
	 */
	top: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	/**
	 * A bottom boundary px on document where Sticky will stop. Could be a selector representing a node
	 * whose bottom should serve as the bottom boundary.
	 */
	bottomBoundary: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	/** Enable the use of CSS3 transforms (true by default). */
	enableTransforms: PropTypes.bool,
	/** Class name to be applied to the element when the sticky state is active (active by default). */
	activeClass: PropTypes.string,
	/** Class name to be applied to the element when the sticky state is released (released by default). */
	releasedClass: PropTypes.string,
	/**
	 * You can be notified when the state of the sticky component changes by passing a callback to the onStateChange
	 * prop. The callback will receive an object in the format {status: CURRENT_STATUS}.
	 */
	onStateChange: PropTypes.func,
	/** Callback to indicate when the sticky plugin should freeze position and ignore scroll/resize events. */
	shouldFreeze: PropTypes.func,
	/** z-index of the sticky. */
	innerZ: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const defaultProps = {
	/**
	 * You can provide a function in the shouldFreeze prop which will tell the component to temporarily stop
	 * updating during prop and state changes, as well as ignore scroll and resize events. This function should
	 * return a boolean indicating whether the component should currently be frozen.
	 */
	shouldFreeze: function() {
		return false;
	},
	/** A switch to enable or disable Sticky (true by default). */
	enabled: true,
	/**
	 * A top offset px for Sticky. Could be a selector representing a node whose height should serve as the top offset.
	 * The value will be add on translate3d(0,top,0) property.
	 */
	top: 0,
	/**
	 * A bottom boundary px on document where Sticky will stop. Could be a selector representing a node
	 * whose bottom should serve as the bottom boundary.
	 */
	bottomBoundary: 0,
	/** Enable the use of CSS3 transforms (true by default). */
	enableTransforms: true,
	/** Class name to be applied to the element when the sticky state is active (active by default). */
	activeClass: 'active',
	/** Class name to be applied to the element when the sticky state is released (released by default). */
	releasedClass: 'released',
	/**
	 * You can be notified when the state of the sticky component changes by passing a callback to the onStateChange
	 * prop. The callback will receive an object in the format {status: CURRENT_STATUS}.
	 */
	onStateChange: null,
};

//-----------------------------------------------------------
// Global Constant
//-----------------------------------------------------------

const STATUS_ORIGINAL = 0; // The default status, locating at the original position.
const STATUS_RELEASED = 1; // The released status, locating at somewhere on document but not default one.
const STATUS_FIXED = 2; // The sticky status, locating fixed to the top or the bottom of screen.

//-----------------------------------------------------------
// Global variable for all instances
//-----------------------------------------------------------

let TRANSFORM_PROP = 'transform';
let doc;
let docBody;
let docEl;
let canEnableTransforms = true; // Use transform by default, so no Sticky on lower-end browser when no Modernizr
let M;
let scrollDelta = 0; // scrollDelta is the distance scroll view has made since the last update.
let win;
let winHeight = -1;

class Sticky extends Component {
	//-----------------------------------------------------------
	// Properties of the component
	//-----------------------------------------------------------

	_delta = 0; // Delta means change.
	_stickyTop = 0;
	_stickyBottom = 0;

	_frozen = false; // Used in only handleScrollStart .
	_skipNextScrollEvent = false; // Used in only handleScrollStart and handleScroll function.
	_scrollTop = -1; // Used in various places.

	_bottomBoundaryTarget;
	_topTarget;
	_subscribers;

	//-----------------------------------------------------------
	// Getter and Setter for properties
	//-----------------------------------------------------------

	/**
	 * @returns {number}
	 */
	get delta() {
		return this._delta;
	}

	/**
	 * @param value
	 */
	set delta(value) {
		this._delta = value;
	}

	/**
	 * @returns {number}
	 */
	get stickyTop() {
		return this._stickyTop;
	}

	/**
	 * @param value
	 */
	set stickyTop(value) {
		this._stickyTop = value;
	}

	/**
	 * @returns {number}
	 */
	get stickyBottom() {
		return this._stickyBottom;
	}

	/**
	 * @param value
	 */
	set stickyBottom(value) {
		this._stickyBottom = value;
	}

	/**
	 * @returns {boolean}
	 */
	get frozen() {
		return this._frozen;
	}

	/**
	 * @param value
	 */
	set frozen(value) {
		this._frozen = value;
	}

	/**
	 * @returns {boolean}
	 */
	get skipNextScrollEvent() {
		return this._skipNextScrollEvent;
	}

	/**
	 * @param value
	 */
	set skipNextScrollEvent(value) {
		this._skipNextScrollEvent = value;
	}

	/**
	 * @returns {number}
	 */
	get scrollTop() {
		return this._scrollTop;
	}

	/**
	 * @param value
	 */
	set scrollTop(value) {
		this._scrollTop = value;
	}

	/**
	 * @returns {*}
	 */
	get bottomBoundaryTarget() {
		return this._bottomBoundaryTarget;
	}

	/**
	 * @param value
	 */
	set bottomBoundaryTarget(value) {
		this._bottomBoundaryTarget = value;
	}

	/**
	 * @returns {*}
	 */
	get topTarget() {
		return this._topTarget;
	}

	/**
	 * @param value
	 */
	set topTarget(value) {
		this._topTarget = value;
	}

	/**
	 * @returns {*}
	 */
	get subscribers() {
		return this._subscribers;
	}

	/**
	 * @param value
	 */
	set subscribers(value) {
		this._subscribers = value;
	}

	//-----------------------------------------------------------
	// State of the component
	//-----------------------------------------------------------

	/**
	 * State of the component
	 * @type {{topBoundary: number, bottomBoundary: *, top: number, pos: number, bottom: number, width: number, x: number, y: number, height: number, status: *, activated: boolean}}
	 */
	state = {
		top: 0, // A top offset from viewport top where Sticky sticks to when scrolling up
		bottom: 0, // A bottom offset from viewport top where Sticky sticks to when scrolling down
		width: 0, // Sticky width
		height: 0, // Sticky height
		x: 0, // The original x of Sticky
		y: 0, // The original y of Sticky
		topBoundary: 0, // The top boundary on document
		bottomBoundary: Infinity, // The bottom boundary on document
		status: STATUS_ORIGINAL, // The Sticky status
		pos: 0, // Real y-axis offset for rendering position-fixed and position-relative
		activated: false, // once browser info is available after mounted, it becomes true to avoid checksum error
	};

	//-----------------------------------------------------------
	// Methods
	//-----------------------------------------------------------

	/**
	 * Update the initial position, width, and height. It should update whenever children change.
	 * @param {Object} [options] - optional top and bottomBoundary new values
	 */
	updateInitialDimension(options) {
		options = options || {};

		let outerRect = this.outerElement.getBoundingClientRect();
		let innerRect = this.innerElement.getBoundingClientRect();

		let width = outerRect.width || outerRect.right - outerRect.left;
		let height = innerRect.height || innerRect.bottom - innerRect.top;
		let outerY = outerRect.top + this.scrollTop;

		this.setState({
			top: this.getTopPosition(options.top),
			bottom: Math.min(this.state.top + height, winHeight),
			width: width,
			height: height,
			x: outerRect.left,
			y: outerY,
			bottomBoundary: this.getBottomBoundary(options.bottomBoundary),
			topBoundary: outerY,
		});
	}

	/**
	 * Update Sticky position.
	 */
	update() {
		let disabled =
			!this.props.enabled ||
			this.state.bottomBoundary - this.state.topBoundary <= this.state.height ||
			(this.state.width === 0 && this.state.height === 0);

		if (disabled) {
			if (this.state.status !== STATUS_ORIGINAL) {
				this.reset();
			}
			return;
		}

		let delta = scrollDelta;
		// "top" and "bottom" are the positions that this.state.top and this.state.bottom project
		// on document from viewport.
		let top = this.scrollTop + this.state.top;
		let bottom = this.scrollTop + this.state.bottom;

		// There are 2 principles to make sure Sticky won't get wrong so much:
		// 1. Reset Sticky to the original postion when "top" <= topBoundary
		// 2. Release Sticky to the bottom boundary when "bottom" >= bottomBoundary
		if (top <= this.state.topBoundary) {
			// #1
			this.reset();
		} else if (bottom >= this.state.bottomBoundary) {
			// #2
			this.stickyBottom = this.state.bottomBoundary;
			this.stickyTop = this.stickyBottom - this.state.height;
			this.release(this.stickyTop);
		} else {
			if (this.state.height > winHeight - this.state.top) {
				// In this case, Sticky is higher then viewport minus top offset
				switch (this.state.status) {
					case STATUS_ORIGINAL:
						this.release(this.state.y);
						this.stickyTop = this.state.y;
						this.stickyBottom = this.stickyTop + this.state.height;
					// Commentting out "break" is on purpose, because there is a chance to transit to FIXED
					// from ORIGINAL when calling window.scrollTo().
					// break;
					// eslint-disable-next-line no-fallthrough
					case STATUS_RELEASED:
						// If "top" and "bottom" are inbetween stickyTop and stickyBottom, then Sticky is in
						// RELEASE status. Otherwise, it changes to FIXED status, and its bottom sticks to
						// viewport bottom when scrolling down, or its top sticks to viewport top when scrolling up.
						this.stickyBottom = this.stickyTop + this.state.height;
						if (delta > 0 && bottom > this.stickyBottom) {
							this.fix(this.state.bottom - this.state.height);
						} else if (delta < 0 && top < this.stickyTop) {
							this.fix(this.state.top);
						}
						break;
					case STATUS_FIXED:
						// eslint-disable-next-line no-case-declarations
						let toRelease = true;
						// eslint-disable-next-line no-case-declarations
						let pos = this.state.pos;
						// eslint-disable-next-line no-case-declarations
						let height = this.state.height;
						// In regular cases, when Sticky is in FIXED status,
						// 1. it's top will stick to the screen top,
						// 2. it's bottom will stick to the screen bottom,
						// 3. if not the cases above, then it's height gets changed
						if (delta > 0 && pos === this.state.top) {
							// case 1, and scrolling down
							this.stickyTop = top - delta;
							this.stickyBottom = this.stickyTop + height;
						} else if (delta < 0 && pos === this.state.bottom - height) {
							// case 2, and scrolling up
							this.stickyBottom = bottom - delta;
							this.stickyTop = this.stickyBottom - height;
						} else if (pos !== this.state.bottom - height && pos !== this.state.top) {
							// case 3
							// This case only happens when Sticky's bottom sticks to the screen bottom and
							// its height gets changed. Sticky should be in RELEASE status and update its
							// sticky bottom by calculating how much height it changed.
							let deltaHeight = pos + height - this.state.bottom;
							this.stickyBottom = bottom - delta + deltaHeight;
							this.stickyTop = this.stickyBottom - height;
						} else {
							toRelease = false;
						}

						if (toRelease) {
							this.release(this.stickyTop);
						}
						break;
					default:
						break;
				}
			} else {
				// In this case, Sticky is shorter then viewport minus top offset
				// and will always fix to the top offset of viewport
				this.fix(this.state.top);
			}
		}
		this.delta = delta;
	}

	//-----------------------------------------------------------
	// Event listeners for events like
	// scroll start, scroll and resize
	//-----------------------------------------------------------

	/**
	 * This function will only execute when user first start to scroll.
	 * @param event - event is the native event object.
	 * @param payload is the additional information also known as AugmentedEvent.
	 */
	handleScrollStart(event, payload) {
		this.frozen = this.props.shouldFreeze();

		if (this.frozen) {
			return;
		}

		if (this.scrollTop === payload.scroll.top) {
			// Scroll position hasn't changed,
			// do nothing
			this.skipNextScrollEvent = true;
		} else {
			this.scrollTop = payload.scroll.top;
			this.updateInitialDimension();
		}
	}

	/**
	 * This function will execute when user start to scroll.
	 * @param event - event is the native event object
	 * @param payload is the additional information also known as AugmentedEvent.
	 */
	handleScroll(event, payload) {
		// Scroll doesn't need to be handled
		if (this.skipNextScrollEvent) {
			this.skipNextScrollEvent = false;
			return;
		}

		scrollDelta = payload.scroll.delta;
		this.scrollTop = payload.scroll.top;
		this.update();
	}

	/**
	 * This function will execute when user resize the window.
	 * @param event - event is the native event object
	 * @param payload - payload is the additional information also known as AugmentedEvent.
	 */
	handleResize(event, payload) {
		if (this.props.shouldFreeze()) {
			return;
		}

		winHeight = payload.resize.height;
		this.updateInitialDimension();
		this.update();
	}

	//-----------------------------------------------------------
	// These functions will execute to set some initial values
	// based on the props.
	//-----------------------------------------------------------

	/**
	 * Get viewable height of an element in pixels, including padding, border and scrollbar, but not the margin.
	 * @param target
	 * @returns {number}
	 */
	getTargetHeight = target => (target && target.offsetHeight) || 0;

	/**
	 * A top offset px for Sticky.
	 * @param {number/string} top
	 * @returns {*|number|Window}
	 */
	getTopPosition(top) {
		// TODO, topTarget is for current layout, may remove
		// a top argument can be provided to override reading from the props
		// eslint-disable-next-line react/prop-types
		top = top || this.props.top || this.props.topTarget || 0;
		// Case for string
		if (typeof top === 'string') {
			if (!this.topTarget) {
				this.topTarget = doc.querySelector(top);
			}
			top = this.getTargetHeight(this.topTarget);
		}
		// Case for number and string
		return top;
	}

	/**
	 * A bottom boundary px on document where Sticky will stop.
	 * @param bottomBoundary
	 * @returns {number}
	 */
	getBottomBoundary(bottomBoundary) {
		// a bottomBoundary can be provided to avoid reading from the props
		let boundary = bottomBoundary || this.props.bottomBoundary;

		// TODO, bottomBoundary was an object, depricate it later.
		if (typeof boundary === 'object') {
			boundary = boundary.value || boundary.target || 0;
		}
		// Case for string
		if (typeof boundary === 'string') {
			if (!this.bottomBoundaryTarget) {
				this.bottomBoundaryTarget = doc.querySelector(boundary);
			}
			boundary = this.getTargetBottom(this.bottomBoundaryTarget);
		}

		// Case for string and number
		return boundary && boundary > 0 ? boundary : Infinity;
	}

	/**
	 * Get bottom target, get value of the bottom position and add scrollTop
	 * @param target
	 * @returns {number}
	 */
	getTargetBottom(target) {
		if (!target) {
			return -1;
		}
		let rect = target.getBoundingClientRect();
		return this.scrollTop + rect.bottom;
	}

	//-----------------------------------------------------------
	// Functions for set scroll status
	//-----------------------------------------------------------

	/**
	 * Reset The default status, locating at the original position.
	 */
	reset() {
		this.setState({
			status: STATUS_ORIGINAL,
			pos: 0,
		});
	}

	/**
	 * Release The released status, locating at somewhere on document but not default one.
	 * @param pos
	 */
	release(pos) {
		this.setState({
			status: STATUS_RELEASED,
			pos: pos - this.state.y,
		});
	}

	/**
	 * Fix The sticky status, locating fixed to the top or the bottom of screen.
	 * @param pos
	 */
	fix(pos) {
		this.setState({
			status: STATUS_FIXED,
			pos: pos,
		});
	}

	//-----------------------------------------------------------
	// Component lifecycle method
	//-----------------------------------------------------------

	// eslint-disable-next-line no-unused-vars
	shouldComponentUpdate(nextProps, nextState, nextContext) {
		/**
		 * shallowEqual():
		 * The equality is performed by iterating through keys on the given value,
		 * and returning false whenever any key has values that are not strictly equal between value and other.
		 * Otherwise, return true whenever the values of all keys are strictly equal.
		 */
		// Component update if it is undefined
		let shouldFreeze = this.props.shouldFreeze();
		// shallowEqualThisPropsNextProps ==> If this.props and nextProps are strictly equal
		let shallowEqualThisPropsNextProps = shallowEqual(this.props, nextProps);
		// shallowEqualThisStateNextState ==> If this.state and nextState are strictly equal
		let shallowEqualThisStateNextState = shallowEqual(this.state, nextState);

		// If current props shouldFreeze() is not undefined && shallowEqualThisPropsNextProps, shallowEqualThisStateNextState
		// are not strictly equal it means component will not update.
		let result =
			!shouldFreeze && !(shallowEqualThisPropsNextProps && shallowEqualThisStateNextState);
		return result;
	}

	// eslint-disable-next-line no-unused-vars
	componentDidUpdate(prevProps, prevState, snapshot) {
		if (prevState.status !== this.state.status && this.props.onStateChange) {
			this.props.onStateChange({ status: this.state.status });
		}
		// if the props for enabling are toggled, then trigger the update or reset depending on the current props
		if (prevProps.enabled !== this.props.enabled) {
			if (this.props.enabled) {
				this.setState({ activated: true }, () => {
					this.updateInitialDimension();
					this.update();
				});
			} else {
				this.setState({ activated: false }, () => {
					this.reset();
				});
			}
		}
	}

	componentDidMount() {
		// Only initialize the globals if this is the first
		// time this component type has been mounted
		if (!win) {
			win = window;
			doc = document;
			docEl = doc.documentElement;
			docBody = doc.body;
			winHeight = win.innerHeight || docEl.clientHeight;
			M = window.Modernizr;
			// No Sticky on lower-end browser when no Modernizr
			if (M && M.prefixed) {
				canEnableTransforms = M.csstransforms3d;
				TRANSFORM_PROP = M.prefixed('transform');
			}
		}

		// when mount, the scrollTop is not necessary on the top
		this.scrollTop = docBody.scrollTop + docEl.scrollTop;

		if (this.props.enabled) {
			this.setState({ activated: true });
			this.updateInitialDimension();
			this.update();
		}
		// bind the listeners regardless if initially enabled - allows the component to toggle sticky functionality
		this.subscribers = [
			subscribe('scrollStart', this.handleScrollStart.bind(this), { useRAF: true }),
			subscribe('scroll', this.handleScroll.bind(this), {
				useRAF: true,
				enableScrollInfo: true,
			}),
			subscribe('resize', this.handleResize.bind(this), { enableResizeInfo: true }),
		];
	}

	componentWillUnmount() {
		let subscribers = this.subscribers || [];
		for (let i = subscribers.length - 1; i >= 0; i--) {
			this.subscribers[i].unsubscribe();
		}
	}

	//-----------------------------------------------------------
	// Translate function
	//-----------------------------------------------------------

	/**
	 * @param {Object} style - Inline styles
	 * @param pos - Real y-axis offset for rendering position-fixed and position-relative
	 */
	translate(style, pos) {
		let enableTransforms = canEnableTransforms && this.props.enableTransforms;
		if (enableTransforms && this.state.activated) {
			style[TRANSFORM_PROP] = 'translate3d(0,' + Math.round(pos) + 'px,0)';
		} else {
			style.top = pos + 'px';
		}
	}

	render() {
		// outerStyle height
		let outerStyle = {};

		//-----------------------------------------------------------
		// Inline styles
		//-----------------------------------------------------------

		// TODO, "overflow: auto" prevents collapse, need a good way to get children height
		let innerStyle = {
			position: this.state.status === STATUS_FIXED ? 'fixed' : 'relative',
			top: this.state.status === STATUS_FIXED ? '0' : '',
			zIndex: this.props.innerZ,
		};

		// always use translate3d to enhance the performance
		this.translate(innerStyle, this.state.pos);

		if (this.state.status !== STATUS_ORIGINAL) {
			innerStyle.width = this.state.width + 'px';
			outerStyle.height = this.state.height + 'px';
		}

		//-----------------------------------------------------------
		// Classes
		//-----------------------------------------------------------

		// eslint-disable-next-line react/prop-types
		let outerClasses = classNames('sticky-outer-wrapper', this.props.className, {
			[this.props.activeClass]: this.state.status === STATUS_FIXED,
			[this.props.releasedClass]: this.state.status === STATUS_RELEASED,
		});

		// eslint-disable-next-line react/prop-types
		let children = this.props.children;

		return (
			<div
				ref={outer => {
					this.outerElement = outer;
				}}
				className={outerClasses}
				style={outerStyle}
			>
				<div
					ref={inner => {
						this.innerElement = inner;
					}}
					className="sticky-inner-wrapper"
					style={innerStyle}
				>
					{typeof children === 'function'
						? children({ status: this.state.status })
						: children}
				</div>
			</div>
		);
	}
}

Sticky.propTypes = propTypes;
Sticky.defaultProps = defaultProps;
Sticky.STATUS_ORIGINAL = STATUS_ORIGINAL;
Sticky.STATUS_RELEASED = STATUS_RELEASED;
Sticky.STATUS_FIXED = STATUS_FIXED;
export default Sticky;
//#endregion Component
