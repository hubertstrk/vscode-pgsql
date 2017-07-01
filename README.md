
# pgsql-html

This is a fork from [vscode-pgsql by doublefint](https://github.com/doublefint/vscode-pgsql)

## Features

The extension recognizes the .sql,.ddl,.dml,.pgsql extension as sql files intended to be run in Postgres.

* Colorization
* Snippets
* Execute current file using psql
* Completion list for global postgres functions

The extension utilizes the -H parameter of the [PostgreSQL Interactive Terminal](https://www.postgresql.org/docs/current/static/app-psql.html) and displays the result as html in a preview window.

## Using

To run the current sql file through psql (Postgres native client) you must add the following settings to your workspace:

```javascript
{ "pgsql.connection": "postgres://username:password@host:port/database" }
```

You must also ensure that psql is in the OS executable path (it will be executed as simply "psql" from vscode).
The command to run the current file is "pgsql: run in postgres".