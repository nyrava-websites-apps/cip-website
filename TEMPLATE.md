# Grupo CIP exact website snapshot

The `dist/` folder contains the current website, including every image, font, stylesheet, script, language page and metadata file.

The snapshot ZIP parts are unpacked automatically by the Restore website snapshot workflow. The workflow verifies every file against `snapshot-checksums.json` before committing the restored source.

For a new website, copy this repository, serve `dist/`, replace the company details and domain, and remove `project_id` from `.openai/hosting.json` before creating a new Sites project. Do not deploy a new template site using the original hosting identity.

Email delivery and analytics remain unconfigured; the current form opens a mail draft. Reference imagery is not evidence of completed company projects.
