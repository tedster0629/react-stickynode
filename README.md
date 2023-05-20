## Story
When I was working on a react project. I needed a component that sticks to the target when the user scrolls the page. After a search, I find that [Yahoo](https://github.com/yahoo/react-stickynode) has already developed a component for this task. I pulled out this package and tried to use it, the package was using react legacy code and I was getting warnings on my console. The package was not maintained so I decided to fix it and change the code to ES7. You can now download an updated version of this.

## Installation
npm:
```
npm install --save react-stickynode-update
```

Yarn:
```
yarn add react-stickynode-update
```
## Getting Started

`react-stickynode` is a performant and comprehensive React sticky component.

A sticky component wraps a sticky target and keeps the target in the viewport as the user scrolls the page. Most sticky components handle the case where the sticky target is shorter than the viewport, but not the case where a sticky target is taller than the viewport. The reason is that the expected behavior and implementation are much more complicated.

`react-stickynode` handles not only regular cases but the long sticky target case in a natural way. In the regular case, when scrolling the page down, `react-stickynode` will stick to the top of the viewport. But in the case of a taller sticky target, it will scroll along with the page until its bottom reaches the bottom of the viewport. In other words, it looks like the bottom of viewport pulls the bottom of a sticky target down when scrolling the page down. On the other hand, when scrolling the page up, the top of viewport pulls the top of a sticky target up.

This behavior gives the content in a tall sticky target more chance to be shown. This is especially good for the case where many ADs are in the right rail.

Another highlight is that `react-stickynode` can handle the case where a sticky target uses a percentage as its width unit. For a responsive designed page, it is especially useful.

## Features

- Retrieve `scrollTop` only once for all sticky components.
- Listen to throttled scrolling to have better performance.
- Use rAF (window.`requestanimationframe()`)  to update sticky status to have better performance.
- Support top offset from the top of the screen.
- Support the bottom boundary to stop sticky status.
- Support any sticky target with various width units.

## Usage

The sticky uses Modernizr `csstransforms3d` and `prefixed` ([link](http://modernizr.com/download/?-csstransforms3d-prefixed)) features to detect IE8/9, so it can downgrade not to use transform3d.

```js
import Sticky from 'react-stickynode-update';

<Sticky enabled={true} top={50} bottomBoundary={1200}>
    <YourComponent/>
</Sticky>
```

```js
import Sticky from 'react-stickynode-update';

<Sticky top='#header' bottomBoundary='#content'>
    <YourComponent/>
</Sticky>
```

### Props

|Name| Type| Note|
|-----|-----|-----|
| `enabled` | Boolean| The switch to enable or disable Sticky (true by default). |
| `top` | Number/String | The offset from the top of the window where the top of the element will be when the sticky state is triggered (0 by default). If it is a selector to a target (via `querySelector()`), the offset will be the height of the target. |
| `bottomBoundary` | Number/String | The offset from the top of the document which release state will be triggered when the bottom of the element reaches at. If it is a selector to a target (via `querySelector()`), the offset will be the bottom of the target. |
| `innerZ` | Number/String | z-index of the sticky. |
| `enableTransforms` | Boolean | Enable the use of CSS3 transforms (true by default). |
| `activeClass` | String | Class name to be applied to the element when the sticky state is active (`active` by default). |
| `releasedClass` | String | Class name to be applied to the element when the sticky state is released (`released` by default). |
| `onStateChange` | Function | Callback for when the sticky state changes. See below. |
| `shouldFreeze` | Function | Callback to indicate when the sticky plugin should freeze position and ignore scroll/resize events. See below. |

### Handling State Change

You can be notified when the state of the sticky component changes by passing a callback to the `onStateChange` prop. The callback will receive an object in the format `{status: CURRENT_STATUS}`, with `CURRENT_STATUS` being an integer representing the status:

| Value | Name | Note|
|-----|-----|-----|
| `0` | `STATUS_ORIGINAL` | The default status, located at the original position.|
| `1` | `STATUS_RELEASED` | The released status, located at somewhere on the document, but not default one.|
| `2` | `STATUS_FIXED` | The sticky status, located fixed to the top or the bottom of the screen.|

You can access the statuses as static constants to use for comparison.
```js
import Sticky from 'react-stickynode-update';

const handleStateChange = (status) => {
    if (status.status === Sticky.STATUS_FIXED) {
        console.log('the component is sticky');
    }
}

<Sticky onStateChange={handleStateChange}>
    <YourComponent/>
</Sticky>
```

Also `Sticky` supports children functions:

```js
import Sticky from 'react-stickynode-update';

<Sticky>
  {status => {
    if (status.status === Sticky.STATUS_FIXED) {
      return 'the component is sticky';
    }
    if (status.status === Sticky.STATUS_ORIGINAL) {
      return 'the component in the original position';
    }
    return 'the component is released'
  }}
</Sticky>
```

### Freezing

You can provide a function in the `shouldFreeze` prop which will tell the component to temporarily stop updating during prop and state changes, as well as ignore scroll and resize events. This function should return a boolean indicating whether the component should currently be frozen.


## License
MIT
