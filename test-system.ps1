# Complete Testing Script for IRTDP React + Node.js Microservices Project
# Run this script in PowerShell to test all system components
# Ensure the backend services are running on localhost:8080 before executing

$baseUrl = "http://localhost:8080"
$wsUrl = "ws://localhost:8080"
$testResults = @{}
$logFile = "test-results.log"
$scriptStartTime = Get-Date

# Initialize log file
"Test run started at: $scriptStartTime" | Out-File -FilePath $logFile -Encoding UTF8

function Write-Step {
    param([string]$message)
    Write-Host "`n=== $message ===" -ForegroundColor Cyan
    "=== $message ===" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Write-Success {
    param([string]$message)
    Write-Host "✓ $message" -ForegroundColor Green
    "✓ $message" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Write-Error {
    param([string]$message)
    Write-Host "✗ $message" -ForegroundColor Red
    "✗ $message" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Write-Info {
    param([string]$message)
    Write-Host "$message" -ForegroundColor Yellow
    $message | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Invoke-RetryApiCall {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [object]$Body = $null,
        [hashtable]$Headers = $null,
        [int]$MaxRetries = 3,
        [int]$DelaySeconds = 2
    )
    
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            $startTime = Get-Date
            
            if ($Body) {
                $jsonBody = $Body | ConvertTo-Json
                $response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $jsonBody -ContentType "application/json" -TimeoutSec 10
            } else {
                $response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -TimeoutSec 10
            }
            
            $endTime = Get-Date
            $responseTime = ($endTime - $startTime).TotalMilliseconds
            
            Write-Info "  Response time: $([math]::Round($responseTime, 2))ms"
            return $response
        } catch {
            Write-Info "  Attempt $attempt failed, retrying in ${DelaySeconds}s..."
            if ($attempt -lt $MaxRetries) {
                Start-Sleep -Seconds $DelaySeconds
            } else {
                throw $_.Exception
            }
        }
    }
}

function Validate-Response {
    param([object]$Response, [array]$RequiredFields)
    foreach ($field in $RequiredFields) {
        if (-not ($Response.PSObject.Properties.Name -contains $field)) {
            throw "Missing required field: $field"
        }
    }
    return $true
}

function Test-Auth {
    Write-Step "1. AUTH TEST"
    try {
        $body = @{
            email = "officer1@police.local"
            password = "password123!"
        }

        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json) -TimeoutSec 10
        
        Validate-Response -Response $loginResponse -RequiredFields @("accessToken", "user")
        Validate-Response -Response $loginResponse.user -RequiredFields @("role")
        
        $script:accessToken = $loginResponse.accessToken
        if (-not $accessToken) { throw "Login did not return an access token." }
        $script:userRole = $loginResponse.user.role
        Write-Success "Login successful - Token: $($accessToken.Substring(0,20))... Role: $($loginResponse.user.role)"
        $testResults["AUTH"] = "PASS"
        
        # Negative test: Invalid login
        Write-Info "  Testing invalid login..."
        try {
            $invalidBody = @{
                email = "invalid@example.com"
                password = "wrongpassword"
            }
            Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($invalidBody | ConvertTo-Json) -TimeoutSec 10
            Write-Error "  Invalid login should have failed"
        } catch {
            if ($_.Exception.Response.StatusCode -eq 401) {
                Write-Success "  Invalid login correctly rejected (401)"
            } else {
                Write-Error "  Invalid login returned unexpected status: $($_.Exception.Response.StatusCode)"
            }
        }
    } catch {
        Write-Error "Auth test failed: $($_.Exception.Message)"
        $testResults["AUTH"] = "FAIL"
    }
}

function Test-IncidentFlow {
    Write-Step "2. INCIDENT FLOW TEST"
    try {
        # Create incident
        $headers = @{ Authorization = "Bearer $accessToken" }
        $incidentData = @{
            title = "Test Incident"
            description = "Testing incident creation"
            category = "test"
            severity = "medium"
            lat = 12.9716
            lng = 77.5946
        }

        $createResponse = Invoke-RetryApiCall -Uri "$baseUrl/api/incidents" -Method "POST" -Body $incidentData -Headers $headers
        
        Validate-Response -Response $createResponse -RequiredFields @("id")
        $script:incidentId = $createResponse.id
        Write-Success "Incident created - ID: $incidentId"

        # Fetch incidents list
        $listResponse = Invoke-RetryApiCall -Uri "$baseUrl/api/incidents" -Method "GET" -Headers $headers
        
        Validate-Response -Response $listResponse -RequiredFields @("data")
        $foundIncident = $listResponse.data | Where-Object { $_.id -eq $incidentId }

        if ($foundIncident -and $foundIncident.title -eq "Test Incident") {
            Write-Success "Incident found in list - Data structure correct"
            $testResults["INCIDENT"] = "PASS"
        } else {
            Write-Error "Incident not found or data incorrect"
            $testResults["INCIDENT"] = "FAIL"
        }
    } catch {
        Write-Error "Incident flow test failed: $($_.Exception.Message)"
        $testResults["INCIDENT"] = "FAIL"
    }
}

function Test-MapRouting {
    Write-Step "3. MAP & ROUTING TEST"
    try {
        $headers = @{ Authorization = "Bearer $accessToken" }
        
        $response = Invoke-RetryApiCall -Uri "$baseUrl/api/routes?fromLat=12.9716&fromLng=77.5946&toLat=12.9720&toLng=77.5950" -Method "GET" -Headers $headers
        
        Validate-Response -Response $response -RequiredFields @("path")
        if ($response.path -and $response.path.Count -gt 0) {
            Write-Success "Route calculated - Path points: $($response.path.Count), Distance: $([math]::Round($response.distance, 2))km"
            $testResults["ROUTING"] = "PASS"
        } else {
            Write-Error "Route calculation failed - No path returned"
            $testResults["ROUTING"] = "FAIL"
        }
    } catch {
        Write-Error "Map routing test failed: $($_.Exception.Message)"
        $testResults["ROUTING"] = "FAIL"
    }
}

function Test-Dispatch {
    Write-Step "4. DISPATCH TEST"
    try {
        $headers = @{ Authorization = "Bearer $accessToken" }
        
        # Assign officer (auto-assign)
        $assignData = @{
            officerId = $null
            autoAssign = $true
        }

        $response = Invoke-RetryApiCall -Uri "$baseUrl/api/dispatch/incidents/$incidentId/assign" -Method "POST" -Body $assignData -Headers $headers
        
        Validate-Response -Response $response -RequiredFields @("dispatchId")
        
        # Check dispatch status
        $dispatchResponse = Invoke-RetryApiCall -Uri "$baseUrl/api/dispatch/incidents/$incidentId" -Method "GET" -Headers $headers
        
        Validate-Response -Response $dispatchResponse -RequiredFields @("status", "officer")
        if ($dispatchResponse.status -and $dispatchResponse.officer) {
            Write-Success "Dispatch created - Status: $($dispatchResponse.status), Officer: $($dispatchResponse.officer.name)"
            $testResults["DISPATCH"] = "PASS"
        } else {
            Write-Error "Dispatch failed - No status or officer assigned"
            $testResults["DISPATCH"] = "FAIL"
        }
    } catch {
        Write-Error "Dispatch test failed: $($_.Exception.Message)"
        $testResults["DISPATCH"] = "FAIL"
    }
}

function Test-WebSocket {
    Write-Step "5. REAL-TIME SOCKET TEST"
    try {
        $webSocket = New-Object System.Net.WebSockets.ClientWebSocket
        $cts = New-Object System.Threading.CancellationTokenSource
        $uri = New-Object System.Uri($wsUrl)
        
        Write-Info "  Connecting to WebSocket..."
        $connectTask = $webSocket.ConnectAsync($uri, $cts.Token)
        if ($connectTask.Wait(5000)) {  # 5 second timeout
            if ($webSocket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                Write-Success "  Connected to WebSocket"
                
                # Send a test message (simulate officer location update)
                $testMessage = @{
                    type = "officer.location.update"
                    data = @{
                        id = "test-officer-123"
                        lat = 12.9716
                        lng = 77.5946
                        lastUpdate = (Get-Date).ToString("o")
                    }
                } | ConvertTo-Json
                
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($testMessage)
                $segment = New-Object System.ArraySegment[byte] -ArgumentList $buffer
                $sendTask = $webSocket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token)
                if ($sendTask.Wait(2000)) {
                    Write-Success "  Test message sent - officer.location.update"
                } else {
                    Write-Error "  Message send timeout"
                }
                
                Write-Info "  Disconnecting..."
                $closeTask = $webSocket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $cts.Token)
                if ($closeTask.Wait(2000)) {
                    Write-Success "  Disconnected from WebSocket"
                    $testResults["WEBSOCKET"] = "PASS"
                } else {
                    Write-Error "  Disconnect timeout"
                    $testResults["WEBSOCKET"] = "FAIL"
                }
            } else {
                Write-Error "  WebSocket connection failed - State: $($webSocket.State)"
                $testResults["WEBSOCKET"] = "FAIL"
            }
        } else {
            Write-Error "  WebSocket connection timeout (5s)"
            $testResults["WEBSOCKET"] = "FAIL"
        }
    } catch {
        Write-Error "WebSocket test failed: $($_.Exception.Message)"
        $testResults["WEBSOCKET"] = "FAIL"
    } finally {
        if ($webSocket) {
            $webSocket.Dispose()
        }
    }
}

function Test-SOS {
    Write-Step "6. SOS ALERT TEST"
    
    # Positive test - valid SOS alert
    try {
        Write-Info "  Testing valid SOS alert..."
        $startTime = Get-Date
        $sosData = @{
            data = @{
                location = @(
                    12.9716,
                    77.5946
                )
            }
        }
        
        $headers = @{ Authorization = "Bearer $accessToken" }
        $response = Invoke-RetryApiCall -Uri "$baseUrl/api/sos" -Method "POST" -Body $sosData -Headers $headers -MaxRetries 3
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Info "  Response time: $([math]::Round($responseTime, 2))ms"
        
        if (Validate-Response -Response $response -RequiredFields @("success", "alertId")) {
            Write-Success "  SOS alert created successfully - ID: $($response.alertId)"
            $testResults["SOS"] = "PASS"
        } else {
            Write-Error "  SOS alert response validation failed"
            $testResults["SOS"] = "FAIL"
        }
    } catch {
        Write-Error "SOS alert test failed: $($_.Exception.Message)"
        $testResults["SOS"] = "FAIL"
    }
    
    # Negative test - invalid SOS data
    try {
        Write-Info "  Testing invalid SOS alert (missing location)..."
        $invalidSosData = @{
            type = "sos.alert"
            data = @{
                citizenId = "citizen-123"
                message = "Emergency!"
                # Missing location field
            }
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/sos" -Method "POST" -Headers $headers -Body ($invalidSosData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        Write-Error "  Expected error but got success response"
        $testResults["SOS"] = "FAIL"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Success "  Invalid SOS alert correctly rejected (400 Bad Request)"
        } else {
            Write-Error "  Unexpected error for invalid SOS: $($_.Exception.Message)"
            $testResults["SOS"] = "FAIL"
        }
    }
}

function Test-PDF {
    Write-Step "7. PDF GENERATION TEST"
    
    # Positive test - valid PDF generation
    try {
        Write-Info "  Testing PDF generation..."
        $startTime = Get-Date
        $pdfData = @{
            incidentId = $incidentId
            incident = @{
                id = $incidentId
                title = "Test Incident"
                description = "Testing PDF generation"
                status = "active"
                priority = "high"
            }
            auditLogs = @(
                @{
                    action = "Created"
                    user = "Test User"
                    timestamp = (Get-Date).ToString("o")
                },
                @{
                    action = "Updated"
                    user = "Test Officer"
                    timestamp = (Get-Date).AddMinutes(-5).ToString("o")
                }
            )
        }
        
        $headers = @{ Authorization = "Bearer $accessToken" }
        $response = Invoke-RetryApiCall -Uri "$baseUrl/api/pdf/generate" -Method "POST" -Body $pdfData -Headers $headers -MaxRetries 3
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Info "  Response time: $([math]::Round($responseTime, 2))ms"
        
        if (Validate-Response -Response $response -RequiredFields @("success", "pdfUrl")) {
            Write-Success "  PDF generated successfully - URL: $($response.pdfUrl)"
            $testResults["PDF"] = "PASS"
        } else {
            Write-Error "  PDF generation response validation failed"
            $testResults["PDF"] = "FAIL"
        }
    } catch {
        Write-Error "PDF generation test failed: $($_.Exception.Message)"
        $testResults["PDF"] = "FAIL"
    }
    
    # Negative test - invalid incident data
    try {
        Write-Info "  Testing PDF generation with invalid data..."
        $invalidPdfData = @{
            incidentId = "invalid-id"
            incident = @{
                # Missing required fields
            }
            auditLogs = @()
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/pdf/generate" -Method "POST" -Headers $headers -Body ($invalidPdfData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        Write-Error "  Expected error but got success response"
        $testResults["PDF"] = "FAIL"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Success "  Invalid PDF data correctly rejected (400 Bad Request)"
        } else {
            Write-Error "  Unexpected error for invalid PDF data: $($_.Exception.Message)"
            $testResults["PDF"] = "FAIL"
        }
    }
}

function Test-ErrorHandling {
    Write-Step "8. ERROR HANDLING TEST"
    
    # Test 404 - Non-existent incident
    try {
        Write-Info "  Testing 404 error for non-existent incident..."
        $startTime = Get-Date
        $headers = @{ Authorization = "Bearer $accessToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/incidents/non-existent-id-12345" -Method "GET" -Headers $headers -TimeoutSec 10
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Info "  Response time: $([math]::Round($responseTime, 2))ms"
        Write-Error "  Expected 404 error but got success response"
        $testResults["ERROR"] = "FAIL"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Success "  404 error correctly returned for non-existent incident"
        } else {
            Write-Error "  Unexpected status code: $($_.Exception.Response.StatusCode)"
            $testResults["ERROR"] = "FAIL"
        }
    }
    
    # Test 401 - Unauthorized access
    try {
        Write-Info "  Testing 401 error for unauthorized access..."
        $startTime = Get-Date
        $response = Invoke-RestMethod -Uri "$baseUrl/api/incidents" -Method "GET" -TimeoutSec 10  # No auth header
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Info "  Response time: $([math]::Round($responseTime, 2))ms"
        Write-Error "  Expected 401 error but got success response"
        $testResults["ERROR"] = "FAIL"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Success "  401 error correctly returned for unauthorized access"
            $testResults["ERROR"] = "PASS"
        } else {
            Write-Error "  Unexpected status code: $($_.Exception.Response.StatusCode)"
            $testResults["ERROR"] = "FAIL"
        }
    }
    
    # Test 400 - Invalid request data
    try {
        Write-Info "  Testing 400 error for invalid request data..."
        $startTime = Get-Date
        $headers = @{ Authorization = "Bearer $accessToken" }
        $invalidData = @{
            invalidField = "test"
            # Missing required fields
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/incidents" -Method "POST" -Headers $headers -Body ($invalidData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Info "  Response time: $([math]::Round($responseTime, 2))ms"
        Write-Error "  Expected 400 error but got success response"
        $testResults["ERROR"] = "FAIL"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Success "  400 error correctly returned for invalid data"
        } else {
            Write-Error "  Unexpected status code: $($_.Exception.Response.StatusCode)"
            $testResults["ERROR"] = "FAIL"
        }
    }
}

function Print-Summary {
    Write-Step "9. FINAL RESULT"
    
    $scriptEndTime = Get-Date
    $totalDuration = $scriptEndTime - $scriptStartTime
    
    # Calculate statistics
    $totalTests = $testResults.Count
    $passedTests = ($testResults.Values | Where-Object { $_ -eq "PASS" }).Count
    $failedTests = $totalTests - $passedTests
    $successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 1) } else { 0 }
    
    # Write to log file
    $summaryText = "TEST EXECUTION SUMMARY`n"
    $summaryText += "======================`n"
    $summaryText += "Execution Time: $($scriptStartTime.ToString('yyyy-MM-dd HH:mm:ss'))`n"
    $summaryText += "Total Duration: $([math]::Round($totalDuration.TotalSeconds, 2)) seconds`n"
    $summaryText += "Total Tests: $totalTests`n"
    $summaryText += "Passed: $passedTests`n"
    $summaryText += "Failed: $failedTests`n"
    $summaryText += "Success Rate: $successRate%`n`n"
    $summaryText += "DETAILED RESULTS:`n"
    
    foreach ($test in $testResults.GetEnumerator()) {
        $status = if ($test.Value -eq "PASS") { "PASS" } else { "FAIL" }
        $summaryText += "$($test.Key.PadRight(15)): $status`n"
    }
    
    $summaryText += "`nRECOMMENDATIONS:`n"
    
    if ($successRate -ge 90) {
        $summaryText += "System is production-ready with excellent test coverage."
    } elseif ($successRate -ge 75) {
        $summaryText += "System is mostly functional but requires attention to failed tests."
    } else {
        $summaryText += "Critical issues detected. System requires immediate attention before deployment."
    }
    
    # Write to log file
    $summaryText | Out-File -FilePath $logFile -Append -Encoding UTF8
    
    # Display to console
    Write-Host "`nTEST SUMMARY:" -ForegroundColor Yellow
    Write-Host ("=" * 60) -ForegroundColor Yellow
    Write-Host "Execution Time: $($scriptStartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host "Total Duration: $([math]::Round($totalDuration.TotalSeconds, 2)) seconds" -ForegroundColor Cyan
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } else { "Red" })
    Write-Host ""
    
    foreach ($test in $testResults.GetEnumerator()) {
        $color = if ($test.Value -eq "PASS") { "Green" } else { "Red" }
        $symbol = if ($test.Value -eq "PASS") { "+" } else { "-" }
        Write-Host ("{0} {1,-15}: {2}" -f $symbol, $test.Key, $test.Value) -ForegroundColor $color
    }
    
    Write-Host "`nOVERALL: $passedTests/$totalTests tests passed ($successRate%)" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
    Write-Host "`nLog file saved to: $logFile" -ForegroundColor Cyan
    
    if ($failedTests -eq 0) {
        Write-Host "`nAll tests passed! System is ready for production." -ForegroundColor Green
    } else {
        Write-Host "`n$failedTests test(s) failed. Please check the log file for details." -ForegroundColor Red
        Write-Host "Review failed tests and system configuration before deployment." -ForegroundColor Yellow
    }
}

# Run all tests
Test-Auth
Test-IncidentFlow
Test-MapRouting
Test-Dispatch
Test-WebSocket
Test-SOS
Test-PDF
Test-ErrorHandling
Print-Summary