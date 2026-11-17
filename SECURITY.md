# Security

This repository is an initial skeleton for local development and is **not production-ready**. Do not
connect it to production systems or store sensitive content in it.

To report a security issue, do not open a public issue with exploit details. Contact the maintainers
through GitHub's private vulnerability reporting feature for this repository.

Before deploying any derivative, replace local credentials, set a private `JWT_SECRET` of at least
32 characters, configure a bcrypt `ADMIN_PASSWORD_HASH`, enable secure cookies over HTTPS, and review
the application, infrastructure, backups, and access controls.
