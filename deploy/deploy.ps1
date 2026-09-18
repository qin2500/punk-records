param(
  [Parameter(Mandatory = $true)][string]$GithubActor,
  [Parameter(Mandatory = $true)][string]$GithubToken
)

$ErrorActionPreference = 'Stop'

# docker-compose.yml and .env.production are scp'd alongside this script on
# every deploy — no repo checkout needed on this machine at all, the server
# only ever runs pre-built images from GHCR.
Set-Location $PSScriptRoot

# Use a private docker config scoped to this script instead of the user's
# default one — Windows Credential Manager (the default credsStore) fails
# under a non-interactive SSH session ("logon session does not exist",
# a DPAPI limitation), and something keeps re-adding it to the shared
# config anyway. A bare {} here means auths get written in plaintext to
# this file only, which is all a pull-then-logout flow needs.
$env:DOCKER_CONFIG = Join-Path $PSScriptRoot '.docker-config'
New-Item -ItemType Directory -Force -Path $env:DOCKER_CONFIG | Out-Null
'{}' | Set-Content (Join-Path $env:DOCKER_CONFIG 'config.json')

# $ErrorActionPreference only catches PowerShell's own errors, not a failed
# exit code from a native command like docker.exe — check explicitly so a
# down Docker engine fails the deploy instead of silently reporting success.
echo $GithubToken | docker login ghcr.io -u $GithubActor --password-stdin
if ($LASTEXITCODE -ne 0) { throw "docker login failed with exit code $LASTEXITCODE" }

docker compose pull
if ($LASTEXITCODE -ne 0) { throw "docker compose pull failed with exit code $LASTEXITCODE" }

docker logout ghcr.io

docker compose --env-file .env.production up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed with exit code $LASTEXITCODE" }

# Runs after `up` so the freshly pulled images are already in use before pruning.
docker image prune -af
