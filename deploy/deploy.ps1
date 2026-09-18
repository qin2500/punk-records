param(
  [Parameter(Mandatory = $true)][string]$GithubActor,
  [Parameter(Mandatory = $true)][string]$GithubToken
)

$ErrorActionPreference = 'Stop'

# docker-compose.yml and .env.production are scp'd alongside this script on
# every deploy — no repo checkout needed on this machine at all, the server
# only ever runs pre-built images from GHCR.
Set-Location $PSScriptRoot

# `docker login`'s credential-SAVE step invokes Docker Desktop's Windows
# credential helper, which fails under this non-interactive SSH session
# ("logon session does not exist" — a DPAPI limitation). Setting credsStore
# to "" had no effect across several attempts, so the helper appears
# hardcoded rather than config-driven. Skip `docker login` entirely and
# write the equivalent auths entry straight into an isolated config file —
# the read path (`docker compose pull`) uses this file directly with no
# helper involved at all.
$dockerConfigDir = Join-Path $PSScriptRoot '.docker-config'
New-Item -ItemType Directory -Force -Path $dockerConfigDir | Out-Null
$authString = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${GithubActor}:${GithubToken}"))
@{ auths = @{ 'ghcr.io' = @{ auth = $authString } } } |
  ConvertTo-Json -Depth 5 |
  Set-Content (Join-Path $dockerConfigDir 'config.json')

# $ErrorActionPreference only catches PowerShell's own errors, not a failed
# exit code from a native command like docker.exe — check explicitly so a
# down Docker engine fails the deploy instead of silently reporting success.
docker --config $dockerConfigDir compose pull
if ($LASTEXITCODE -ne 0) { throw "docker compose pull failed with exit code $LASTEXITCODE" }

docker compose --env-file .env.production up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed with exit code $LASTEXITCODE" }

# Runs after `up` so the freshly pulled images are already in use before pruning.
docker image prune -af

# The auths file holds a live token in plaintext — remove it now rather
# than leaving it on disk between deploys.
Remove-Item -Recurse -Force $dockerConfigDir
