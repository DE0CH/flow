<h1 align="center"><a href="https://flowoss.com">Flow - Open Source Software (OSS)</a></h1>

<h2 align="center">Redefine ePub reader</h2>

<p align="center">Free. Open source. Browser-based.</p>

<p align="center">This is a fork of the <a href="https://github.com/pacexy/flow">upstream Flow</a> that uses Firebase for syncing across devices. It makes a certain kind of self-hosting easier: instead of renting a VPS, you can run it on serverless or platform-as-a-service (PaaS) offerings that often have free tiers, which can be cheaper than a paid VPS.</p>

<p align="center"><img src="apps/website/public/screenshots/01.webp"/>

</p>

## Features

- Grid layout
- Search in book
- Image preview
- Custom typography
- Highlight and Annotation
- Theme
- Share/Download book with link
- Data export
- Cloud storage

For planed features, see our [roadmap](https://pacexy.notion.site/283696d0071c43bfb03652e8e5f47936?v=b43f4dd7a3cb4ce785d6c32b698a8ff5).

## Development

### Prerequisites

- [Node.js](https://nodejs.org)
- [pnpm](https://pnpm.io/installation)
- [Git](https://git-scm.com/downloads)

### Clone the repo

```bash
git clone https://github.com/pacexy/flow
```

### Install the dependencies

```bash
pnpm i
```

### Firebase (required)

Flow requires [Firebase](https://console.firebase.google.com) for authentication, data, and cloud storage. Self-hosting without Firebase is not supported.

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication** (e.g. Google sign-in), **Firestore**, and **Storage**.
3. Copy the project’s config into your env (see below).

### Setup the environment variables

Copy each app’s `.env.local.example` to `.env.local` and fill in the values. For the reader app you must set the Firebase variables from your Firebase project config.

### Run the apps

```bash
pnpm dev
```

## Contributing

There are many ways in which you can participate in this project, for example:

- [Submit bugs and feature requests](https://github.com/pacexy/flow/issues/new), and help us verify as they are checked in
- [Submit pull requests](https://github.com/pacexy/flow/pulls)

## Credits

- [Epub.js](https://github.com/futurepress/epub.js/)
- [React](https://github.com/facebook/react)
- [Next.js](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org)
- [Vercel](https://vercel.com)
- [Turborepo](https://turbo.build/repo)
