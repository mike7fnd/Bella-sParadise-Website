# Headless booking test script
# - Waits for server to be ready
# - Creates a test facility
# - Registers (or skips if exists) a test user
# - Logs in and posts a booking
# - Prints bookings for the logged-in user

$base = 'http://localhost:3000'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "Waiting for server at $base ..."
$max = 20; $i = 0
while ($i -lt $max) {
    try {
        $r = Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 2 -ErrorAction Stop
        Write-Host "Server responded"
        break
    } catch {
        Start-Sleep -Seconds 1
        $i++
    }
}
if ($i -ge $max) { Write-Error "Server did not respond after $max seconds"; exit 1 }

# 1) Create facility
try {
    $facilityPayload = @{ name = 'HEADLESS Test Facility'; type = 'Kubo'; capacity = 4; price = 1000; status = 'available'; description = 'Created by headless test' } | ConvertTo-Json
    $fac = Invoke-RestMethod -Uri "$base/api/facilities" -Method Post -Body $facilityPayload -ContentType 'application/json' -ErrorAction Stop
    Write-Host "Created facility id: $($fac.id)"
} catch {
    Write-Warning "Failed to create facility: $_. Exception.Message"
    # try to fetch first facility
    try { $facs = Invoke-RestMethod -Uri "$base/api/facilities" -Method Get; $fac = $facs[0]; Write-Host "Using existing facility id: $($fac.id)" } catch { Write-Error "Unable to determine facility id"; exit 1 }
}

# 2) Register test user (ignore if exists)
$testUser = @{ first_name='Headless'; last_name='Tester'; email='headless@example.com'; mobile='09123456789'; province='TestProv'; city='TestCity'; barangay='TestBarangay'; street='TestStreet'; password='testpass'; sec_question_1='q1'; sec_answer_1='a1'; sec_question_2='q2'; sec_answer_2='a2' }
try {
    Invoke-RestMethod -Uri "$base/signup" -Method Post -Body ($testUser | ConvertTo-Json) -ContentType 'application/json' -ErrorAction Stop
    Write-Host "Registered test user"
} catch {
    Write-Warning "Register returned error (maybe already exists): $($_.Exception.Message)"
}

# 3) Login and keep cookies in session
$login = @{ email = $testUser.email; password = $testUser.password } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$base/login" -Method Post -Body $login -ContentType 'application/json' -WebSession $session -ErrorAction Stop
    Write-Host "Login succeeded (session stored)"
} catch {
    Write-Warning "Login may have redirected or failed: $($_.Exception.Message)"
}

# 4) Create booking as logged-in user
$bookingPayload = @{ facilityId = $fac.id; check_in = (Get-Date).AddDays(7).ToString('yyyy-MM-dd'); check_out = (Get-Date).AddDays(8).ToString('yyyy-MM-dd'); guests = 2; contact_phone = '09123456789'; notes = 'Headless test booking' } | ConvertTo-Json
try {
    $bkRes = Invoke-RestMethod -Uri "$base/api/bookings" -Method Post -Body $bookingPayload -ContentType 'application/json' -WebSession $session -ErrorAction Stop
    Write-Host "Booking response: $($bkRes.message) id=$($bkRes.booking.id)"
} catch {
    # Print detailed error response body if available for debugging
    try {
        $respStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($respStream)
        $body = $reader.ReadToEnd()
        Write-Error "Failed to create booking: $($_.Exception.Message)\nResponse body: $body"
    } catch {
        Write-Error "Failed to create booking: $($_.Exception.Message)"
    }
    exit 1
}

# 5) Fetch my bookings
try {
    $mine = Invoke-RestMethod -Uri "$base/api/bookings/mine" -Method Get -WebSession $session -ErrorAction Stop
    Write-Host "My bookings:"
    $mine | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Error "Failed to fetch my bookings: $($_.Exception.Message)"
}

Write-Host "Headless booking test complete"
