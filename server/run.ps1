$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "Missing server\.env. Copy server\.env.example to server\.env and add your MongoDB URI."
    exit 1
}

$mongoUri = $null
foreach ($line in Get-Content $envFile) {
    $entry = $line.Trim()
    if (-not $entry -or $entry.StartsWith('#')) {
        continue
    }

    $separator = $entry.IndexOf('=')
    if ($separator -lt 1 -or $entry.Substring(0, $separator).Trim() -ne 'MONGODB_URI') {
        continue
    }

    $mongoUri = $entry.Substring($separator + 1).Trim()
    if ($mongoUri.Length -ge 2 -and (($mongoUri.StartsWith('"') -and $mongoUri.EndsWith('"')) -or ($mongoUri.StartsWith("'") -and $mongoUri.EndsWith("'")))) {
        $mongoUri = $mongoUri.Substring(1, $mongoUri.Length - 2)
    }
    break
}

if ([string]::IsNullOrWhiteSpace($mongoUri) -or $mongoUri -match '<[^>]+>' -or $mongoUri -notmatch '^mongodb(\+srv)?://') {
    Write-Error "MONGODB_URI in server\.env is missing or still contains the example value. Add a valid MongoDB URI."
    exit 1
}

$jarPath = Join-Path $PSScriptRoot 'target\marketplace-0.0.1-SNAPSHOT.jar'
$maven = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $maven) {
    if (-not (Test-Path $jarPath)) {
        Write-Error 'Maven is not installed and the prebuilt server JAR was not found.'
        exit 1
    }

    $jarLastWriteTime = (Get-Item $jarPath).LastWriteTimeUtc
    $sourceFiles = @()
    $mainSourceDirectory = Join-Path $PSScriptRoot 'src\main'
    if (Test-Path $mainSourceDirectory) {
        $sourceFiles = @(Get-ChildItem -LiteralPath $mainSourceDirectory -Recurse -File)
    }

    $pomPath = Join-Path $PSScriptRoot 'pom.xml'
    if (Test-Path $pomPath) {
        $sourceFiles += Get-Item $pomPath
    }

    $javaSourceDirectory = Join-Path $PSScriptRoot 'src\main\java'
    $classesDirectory = Join-Path $PSScriptRoot 'target\classes'
    $staleCompiledSource = $null
    if (-not (Test-Path $classesDirectory)) {
        $staleCompiledSource = 'compiled classes are missing'
    } elseif (Test-Path $javaSourceDirectory) {
        foreach ($javaFile in (Get-ChildItem -LiteralPath $javaSourceDirectory -Recurse -Filter '*.java' -File)) {
            $relativeSourcePath = $javaFile.FullName.Substring($javaSourceDirectory.Length).TrimStart('\')
            $classPath = Join-Path $classesDirectory ([System.IO.Path]::ChangeExtension($relativeSourcePath, '.class'))
            if (-not (Test-Path $classPath) -or $javaFile.LastWriteTimeUtc -gt (Get-Item $classPath).LastWriteTimeUtc) {
                $staleCompiledSource = $javaFile.FullName
                break
            }
        }
    }

    if ($staleCompiledSource) {
        Write-Error "The prebuilt server JAR cannot be verified against current source ($staleCompiledSource). Install Maven and rebuild before starting the backend."
        exit 1
    }

    $newerSourceFile = $sourceFiles |
        Where-Object { $_.LastWriteTimeUtc -gt $jarLastWriteTime } |
        Select-Object -First 1
    if ($newerSourceFile) {
        Write-Error "The prebuilt server JAR is older than source file '$($newerSourceFile.FullName)'. Install Maven and run this script to start the current source instead of stale routes."
        exit 1
    }
}

$previousMongoUri = $env:MONGODB_URI
$previousSpringMongoUri = $env:SPRING_DATA_MONGODB_URI
$exitCode = 0
Push-Location $PSScriptRoot
try {
    $env:MONGODB_URI = $mongoUri
    $env:SPRING_DATA_MONGODB_URI = $mongoUri
    if ($maven) {
        & mvn spring-boot:run
    } else {
        Write-Warning 'Maven is unavailable; starting the prebuilt server JAR because it is not older than the current source.'
        & java -jar '.\target\marketplace-0.0.1-SNAPSHOT.jar'
    }
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
    $env:MONGODB_URI = $previousMongoUri
    $env:SPRING_DATA_MONGODB_URI = $previousSpringMongoUri
}

if ($exitCode -ne 0) {
    exit $exitCode
}
