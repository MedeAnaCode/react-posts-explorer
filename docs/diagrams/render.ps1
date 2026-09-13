param(
  [string]$PlantUmlServer = 'http://127.0.0.1:18080'
)

$ErrorActionPreference = 'Stop'
$diagramDirectory = $PSScriptRoot
$sourceFiles = Get-ChildItem -LiteralPath $diagramDirectory -Filter '*.puml' -File

foreach ($sourceFile in $sourceFiles) {
  $source = Get-Content -Raw -LiteralPath $sourceFile.FullName

  foreach ($format in @('png', 'svg')) {
    $outputPath = Join-Path $diagramDirectory "$($sourceFile.BaseName).$format"
    $requestParameters = @{
      Uri = "$PlantUmlServer/$format"
      Method = 'Post'
      ContentType = 'text/plain; charset=utf-8'
      Body = [System.Text.Encoding]::UTF8.GetBytes($source)
      OutFile = $outputPath
    }

    Invoke-WebRequest @requestParameters
  }
}

Write-Host "Rendered $($sourceFiles.Count) PlantUML diagrams to PNG and SVG."
