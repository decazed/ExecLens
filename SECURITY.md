# Security Policy

## Supported versions

Execlens is pre-1.0. Only the latest commit on `main` receives security fixes.

## Trust model

Execlens **executes code from the workspace you open it in**. When you run
`Execlens: Open Simulator` on a function, the language adapter analyzes the file
and the runtime adapter loads and calls that code.

The Node.js runtime adapter runs the target function in a **child Node process
with no sandboxing**. It has the same filesystem, network, and environment access
as any script you would run with `node`. A timeout bounds execution, but it does
not contain side effects.

Consequences:

- Only open Execlens on code you trust, the same way you would only `npm install`
  or `node ./script.js` in a repository you trust.
- Opening the simulator on a function can trigger arbitrary code in that module's
  import side effects, not only the function body.
- Do not point Execlens at untrusted or attacker-controlled repositories.

Hardening the runtime (process isolation, resource limits, opt-in network/FS
policies) is on the roadmap and tracked as a runtime-adapter concern.

## Reporting a vulnerability

Please report security issues **privately**, not in public issues or pull
requests.

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue, affected version/commit, and a reproduction if possible.

If you cannot use that form, email **baptiste.collinot@gmail.com** instead.

You should get an initial response within a week. Once a fix is available and
released, the advisory will be published with credit to the reporter unless you
ask to stay anonymous.
