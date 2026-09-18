param(
  [Parameter(Mandatory = $true)][string]$GithubActor,
  [Parameter(Mandatory = $true)][string]$GithubToken
)

$ErrorActionPreference = 'Stop'

# docker-compose.yml and .env.production are scp'd alongside this script on
# every deploy — no repo checkout needed on this machine at all, the server
# only ever runs pre-built images from GHCR.
Set-Location $PSScriptRoot

# Use a private docker config scoped to this script, passed explicitly via
# --config on every call rather than the DOCKER_CONFIG env var, in case that
# doesn't survive the SSH -> PowerShell -> docker.exe process chain intact.
# Windows Credential Manager (Docker Desktop's default credsStore, which it
# applies even when the config omits the key) fails under this non-interactive
# SSH session with "logon session does not exist" (a DPAPI limitation) —
# credsStore: "" is the documented way to force plaintext auth storage in
# this file instead, which is all a pull-then-logout flow needs.
$dockerConfigDir = Join-Path $PSScriptRoot '.docker-config'
New-Item -ItemType Directory -Force -Path $dockerConfigDir | Out-Null
'{"credsStore": ""}' | Set-Content (Join-Path $dockerConfigDir 'config.json')

# $ErrorActionPreference only catches PowerShell's own errors, not a failed
# exit code from a native command like docker.exe — check explicitly so a
# down Docker engine fails the deploy instead of silently reporting success.
echo $GithubToken | docker --config $dockerConfigDir login ghcr.io -u $GithubActor --password-stdin
if ($LASTEXITCODE -ne 0) { throw "docker login failed with exit code $LASTEXITCODE" }

docker --config $dockerConfigDir compose pull
if ($LASTEXITCODE -ne 0) { throw "docker compose pull failed with exit code $LASTEXITCODE" }

docker --config $dockerConfigDir logout ghcr.io

docker compose --env-file .env.production up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed with exit code $LASTEXITCODE" }

# Runs after `up` so the freshly pulled images are already in use before pruning.
docker image prune -af
