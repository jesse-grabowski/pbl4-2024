# PBL4 Project Website Repository

## Javascript/Typescript Info

### APIs

- <https://github.com/cwaku/Leaderboard>
  - This is leaderboard animation, instead of storing leaderboard data. However, the API this use (which is the next link) is exactly what we want.
- <https://microverse.notion.site/Leaderboard-API-service-24c0c3c116974ac49488d4eb0267ade3>
  - This is a simple leaderboard API that only allows to POST scores and GET scores. This is exactly what we need, it is likely we are continuing with this API as our external leaderboard service.
- <https://github.com/Mwapsam/leaderboard>
  - This seems to be a similar project as the first link, just more barebone.
- <https://github.com/kamranahmedse/driver.js>
  - This API seems very useful for new users, essentially perfect to make tutorial playthrough animations. Depending on the Designers, whether if tutorial-ish feature is included, this API is would be a good candidate. Plus, the demo website seems to have quite a lot of examples, for a low priority feature, it would save a lot of time if we decide to implement a tutorial.
- <https://github.com/toss/es-toolkit>
  - This is an utility library, like numpy. I don't this with the scope of this project, this would be that helpful. Since the complexity of the code is probably low, it would only make some codes several lines shorter, it doesn't seems worth it to invest the time to learn this. Basic js should be enough.

> [!NOTE]
> Paragraphs below are copied from Vue template Readme

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Vue Extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Vue Extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Developing Guide

> [!NOTE]
> For the operations below, you need to have [Node.js](https://nodejs.org/en/download/package-manager) installed on your computer.
> In this project, we use the LTS version (20.18).
> The commands are executed in the terminal with 'pbl4-2024' as the working directory

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
