# Vendored fonts

`inter-latin-variable.woff2` — Inter, latin subset, variable weight 100–900.

Vendored deliberately. It used to be pulled with `next/font/google`, which
fetches from Google Fonts **during `next build`**. That makes the build depend
on network access to a third party, and it broke: the arm64 image build failed
with `ETIMEDOUT` fetching Inter, because the request is slow enough under
emulation to hit `next/font`'s timeout.

The same failure hits anyone building on a slow link or without internet, and
it is a build-time dependency on an external service for a product whose whole
premise is self-hosting. Serving the file from the repo removes it.

Downloaded from the URL in
`https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap`.
To update, re-fetch that CSS and replace this file with the latin `woff2` it
points at.

## License

Inter is licensed under the SIL Open Font License 1.1 — see `OFL.txt`.
Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter).
