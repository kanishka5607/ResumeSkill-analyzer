param([string]$ImagePath)

$ErrorActionPreference = "Stop"

try {
    # Ensure WinRT OCR types are loaded
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation.Diagnostics, ContentType = WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

    $runtimeDir = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
    $runtimeAsm = [System.IO.Path]::Combine($runtimeDir, "System.Runtime.WindowsRuntime.dll")
    if (Test-Path $runtimeAsm) {
        [System.Reflection.Assembly]::LoadFrom($runtimeAsm) | Out-Null
    }

    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and 
        $_.GetParameters().Count -eq 1 -and 
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    })[0]

    function AwaitTask($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        try {
            $netTask.Wait(-1) | Out-Null
        } catch {
            Write-Error "WinRT task error: $($netTask.Exception.InnerException.Message)"
            throw
        }
        return $netTask.Result
    }

    $fullPath = [System.IO.Path]::GetFullPath($ImagePath)
    if (-not (Test-Path $fullPath)) {
        throw "Image file not found: $fullPath"
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $memStream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
    $writer = [Windows.Storage.Streams.DataWriter]::new($memStream)
    $writer.WriteBytes($bytes)
    
    $asTaskStore = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and 
        $_.GetParameters().Count -eq 1 -and 
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    })[0].MakeGenericMethod([uint32])
    $storeTask = $asTaskStore.Invoke($null, @($writer.StoreAsync()))
    $storeTask.Wait(-1) | Out-Null
    $writer.DetachStream() | Out-Null

    $memStream.Seek(0)
    $decoder = AwaitTask ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($memStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = AwaitTask ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
    }
    
    $ocrResult = AwaitTask ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

    Write-Output "===OCR_START==="
    # Output line by line to preserve layout and sections
    foreach ($line in $ocrResult.Lines) {
        Write-Output $line.Text
    }
    Write-Output "===OCR_END==="
} catch {
    Write-Error "OCR Execution failed: $_"
    exit 1
}
