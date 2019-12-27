<?php
#!/usr/local/bin/php -q
$numbers = array("...", );
//$numbers = array("[my phone number]");
$countdown_to = date("z", mktime(0, 0, 0, 12, 25, 2006));
$today = date("z");
$days = $countdown_to - $today;
if($days == 0) {
	$message = "MERRY CHRISTMAS!";
}
else {
	$message = "Only $days more days until Christmas!";
}
foreach($numbers as $number) {
	mail($number ."@vtext.com", "", $message);
	mail($number ."@txt.att.net", "", $message);
}
?>