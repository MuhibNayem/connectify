# Connectify

Connectify is a modern social media application built with SvelteKit. It provides a platform for users to connect with friends, share posts, and chat in real-time.

## Features

*   **Authentication:** Secure user registration and login.
*   **Feed:** A central place to view posts from friends.
*   **Friends System:** Manage friend requests and view your connections.
*   **Real-time Messaging:** Chat with your friends instantly.
*   **User Profiles:** View and customize your user profile.

## Technologies Used

*   **Framework:** [SvelteKit](https://kit.svelte.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** A combination of custom components and primitives from [shadcn-svelte](https://shadcn-svelte.com/).
*   **Icons:** [Lucide Svelte](https://lucide.dev/guide/packages/lucide-svelte)

## Local Development

To get started with local development:

1.  **Install dependencies:**
    ```sh
    pnpm install
    ```
2.  **Start the development server:**
    ```sh
    pnpm run dev
    ```
    The application will be accessible at `http://localhost:5173`.

## Building for Production

To create a production-ready build of the application:

1.  **Build the application:**
    ```sh
    pnpm run build
    ```
    The build output will be in the `.svelte-kit/` directory.

2.  **Preview the production build:**
    ```sh
    pnpm run preview
    ```

## Linting and Formatting

*   **Lint code:**
    ```sh
    pnpm run lint
    ```
*   **Format code:**
    ```sh
    pnpm run format
    ```

## Project Structure

*   `src/lib/`: Contains the core logic of the application, including API communication, UI components, and utility functions.
    *   `src/lib/api.ts`: Functions for interacting with the backend API.
    *   `src/lib/components/`: Reusable Svelte components.
    *   `src/lib/utils.ts`: Utility functions.
*   `src/routes/`: Defines the pages and API routes of the application. Each file and directory in this folder corresponds to a URL path.
*   `static/`: Contains static assets like images and fonts.
