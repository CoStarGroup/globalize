define([
	"./day-of-week",
	"./day-of-year",
	"./first-day-of-week",
	"./milliseconds-in-day",
	"./pattern-re",
	"./start-of",
	"./timezone/hour-format",
	"./week-days",
	"../util/string/pad"
], function( dateDayOfWeek, dateDayOfYear, dateFirstDayOfWeek, dateMillisecondsInDay, datePatternRe, dateStartOf, dateTimezoneHourFormat, dateWeekDays, stringPad ) {

/**
 * format( date, pattern, cldr )
 *
 * @date [Date instance].
 *
 * @pattern [String] raw pattern.
 * ref: http://www.unicode.org/reports/tr35/tr35-dates.html#Date_Format_Patterns
 *
 * @cldr [Cldr instance].
 *
 * TODO Support other calendar types.
 *
 * Disclosure: this function borrows excerpts of dojo/date/locale.
 */
return function( date, pattern, cldr ) {
	var widths = [ "abbreviated", "wide", "narrow" ];
	return pattern.replace( datePatternRe, function( current ) {
		var pad, ret,
			chr = current.charAt( 0 ),
			length = current.length;

		if ( chr === "j" ) {
			// Locale preferred hHKk.
			// http://www.unicode.org/reports/tr35/tr35-dates.html#Time_Data
			chr = cldr.supplemental.timeData.preferred();
		}

		if ( chr === "Z" ) {
			// Z..ZZZ: same as "xxxx".
			if ( length < 4 ) {
				chr = "x";
				length = 4;

			// ZZZZ: same as "OOOO".
			} else if ( length < 5 ) {
				chr = "O";
				length = 4;

			// ZZZZZ: same as "XXXXX"
			} else {
				chr = "X";
				length = 5;
			}
		}

		switch ( chr ) {

			// Era
			case "G":
				ret = cldr.main([
					"dates/calendars/gregorian/eras",
					length <= 3 ? "eraAbbr" : ( length === 4 ? "eraNames" : "eraNarrow" ),
					date.getFullYear() < 0 ? 0 : 1
				]);
				break;

			// Year
			case "y":
				// Plain year.
				// The length specifies the padding, but for two letters it also specifies the maximum length.
				ret = String( date.getFullYear() );
				pad = true;
				if ( length === 2 ) {
					ret = ret.substr( ret.length - 2 );
				}
				break;

			case "Y":
				// Year in "Week of Year"
				// The length specifies the padding, but for two letters it also specifies the maximum length.
				// yearInWeekofYear = date + DaysInAWeek - (dayOfWeek - firstDay) - minDays
				ret = new Date( date.getTime() );
				ret.setDate( ret.getDate() + 7 - ( dateDayOfWeek( date, cldr ) - dateFirstDayOfWeek( cldr ) ) - cldr.supplemental.weekData.minDays() );
				ret = String( ret.getFullYear() );
				pad = true;
				if ( length === 2 ) {
					ret = ret.substr( ret.length - 2 );
				}
				break;

			case "u": // Extended year. Need to be implemented.
			case "U": // Cyclic year name. Need to be implemented.
				throw new Error( "Not implemented" );

			// Quarter
			case "Q":
			case "q":
				ret = Math.ceil( ( date.getMonth() + 1 ) / 3 );
				if ( length <= 2 ) {
					pad = true;
				} else {
					// http://unicode.org/cldr/trac/ticket/6788
					ret = cldr.main([
						"dates/calendars/gregorian/quarters",
						chr === "Q" ? "format" : "stand-alone",
						widths[ length - 3 ],
						ret
					]);
				}
				break;

			// Month
			case "M":
			case "L":
				ret = date.getMonth() + 1;
				if ( length <= 2 ) {
					pad = true;
				} else {
					ret = cldr.main([
						"dates/calendars/gregorian/months",
						chr === "M" ? "format" : "stand-alone",
						widths[ length - 3 ],
						ret
					]);
				}
				break;

			// Week
			case "w":
				// Week of Year.
				// woy = ceil( ( doy + dow of 1/1 ) / 7 ) - minDaysStuff ? 1 : 0.
				// TODO should pad on ww? Not documented, but I guess so.
				ret = dateDayOfWeek( dateStartOf( date, "year" ), cldr );
				ret = Math.ceil( ( dateDayOfYear( date ) + ret ) / 7 ) - ( 7 - ret >= cldr.supplemental.weekData.minDays() ? 0 : 1 );
				pad = true;
				break;

			case "W":
				// Week of Month.
				// wom = ceil( ( dom + dow of `1/month` ) / 7 ) - minDaysStuff ? 1 : 0.
				ret = dateDayOfWeek( dateStartOf( date, "month" ), cldr );
				ret = Math.ceil( ( date.getDate() + ret ) / 7 ) - ( 7 - ret >= cldr.supplemental.weekData.minDays() ? 0 : 1 );
				break;

			// Day
			case "d":
				ret = date.getDate();
				pad = true;
				break;

			case "D":
				ret = dateDayOfYear( date ) + 1;
				pad = true;
				break;

			case "F":
				// Day of Week in month. eg. 2nd Wed in July.
				ret = Math.floor( date.getDate() / 7 ) + 1;
				break;

			case "g+":
				// Modified Julian day. Need to be implemented.
				throw new Error( "Not implemented" );

			// Week day
			case "e":
			case "c":
				if ( length <= 2 ) {
					// Range is [1-7] (deduced by example provided on documentation)
					// TODO Should pad with zeros (not specified in the docs)?
					ret = dateDayOfWeek( date, cldr ) + 1;
					pad = true;
					break;
				}

			/* falls through */
			case "E":
				ret = dateWeekDays[ date.getDay() ];
				if ( length === 6 ) {
					// If short day names are not explicitly specified, abbreviated day names are used instead.
					// http://www.unicode.org/reports/tr35/tr35-dates.html#months_days_quarters_eras
					// http://unicode.org/cldr/trac/ticket/6790
					ret = cldr.main([
							"dates/calendars/gregorian/days",
							[ chr === "c" ? "stand-alone" : "format" ],
							"short",
							ret
						]) || cldr.main([
							"dates/calendars/gregorian/days",
							[ chr === "c" ? "stand-alone" : "format" ],
							"abbreviated",
							ret
						]);
				} else {
					ret = cldr.main([
						"dates/calendars/gregorian/days",
						[ chr === "c" ? "stand-alone" : "format" ],
						widths[ length < 3 ? 0 : length - 3 ],
						ret
					]);
				}
				break;

			// Period (AM or PM)
			case "a":
				ret = cldr.main([
					"dates/calendars/gregorian/dayPeriods/format/wide",
					date.getHours() < 12 ? "am" : "pm"
				]);
				break;

			// Hour
			case "h": // 1-12
				ret = ( date.getHours() % 12 ) || 12;
				pad = true;
				break;

			case "H": // 0-23
				ret = date.getHours();
				pad = true;
				break;

			case "K": // 0-11
				ret = date.getHours() % 12;
				pad = true;
				break;

			case "k": // 1-24
				ret = date.getHours() || 24;
				pad = true;
				break;

			// Minute
			case "m":
				ret = date.getMinutes();
				pad = true;
				break;

			// Second
			case "s":
				ret = date.getSeconds();
				pad = true;
				break;

			case "S":
				ret = Math.round( date.getMilliseconds() * Math.pow( 10, length - 3 ) );
				pad = true;
				break;

			case "A":
				ret = Math.round( dateMillisecondsInDay( date ) * Math.pow( 10, length - 3 ) );
				pad = true;
				break;

			// Zone
			case "z":
				/*
				ret = cldr.main([
					"dates/timeZoneNames/metazone",
					metaZone(), // FIXME eg. Brasilia, America_Pacific.
					length < 4 ? "short" : "long",
					standardOrDaylight() // FIXME eg. generic, standard, daylight
				]);
				// FIXME Or fallback to O or OOOO
				*/
				break;

			case "O":
				// O: "{gmtFormat}+H;{gmtFormat}-H" or "{gmtZeroFormat}", eg. "GMT-8" or "GMT".
				// OOOO: "{gmtFormat}{hourFormat}" or "{gmtZeroFormat}", eg. "GMT-08:00" or "GMT".
				if ( date.getTimezoneOffset() === 0 ) {
					ret = cldr.main( "dates/timeZoneNames/gmtZeroFormat" );
				} else {
					ret = dateTimezoneHourFormat( date, length < 4 ? "+H;-H" : cldr.main( "dates/timeZoneNames/hourFormat" ) );
					ret = cldr.main( "dates/timeZoneNames/gmtFormat" ).replace( /\{0\}/, ret );
				}
				break;

			case "v":
				/*
				// FIXME: very similar with "z", except zz, zzz, and fallback.
				ret = cldr.main([
					"dates/timeZoneNames/metazone",
					metaZone(), // FIXME eg. Brasilia, America_Pacific.
					length < 4 ? "short" : "long",
					"generic"
				]);
				// FIXME Or fallback to:
				// L1: falls back to the generic location format ("VVVV"), then the short localized GMT format as the final fallback. ???? weird, check ICU.
				// L4: falls back to generic location format ("VVVV").
				*/
				break;

			case "V":
				// L1: ignore
				// L2: The long time zone ID. Needs bcp47 :-S. ignore.
				// L3: ...

			case "X":
				// Same as x*, except it uses "Z" for zero offset.
				if ( date.getTimezoneOffset() === 0 ) {
					ret = "Z";
					break;
				}

			/* falls through */
			case "x":
				// x: hourFormat("+HH;-HH")
				// xx or xxxx: hourFormat("+HHmm;-HHmm")
				// xxx or xxxxx: hourFormat("+HH:mm;-HH:mm")
				ret = length === 1 ? "+HH;-HH" : ( length % 2 ? "+HH:mm;-HH:mm" : "+HHmm;-HHmm" );
				ret = dateTimezoneHourFormat( date, ret );
				break;

			// Anything else is considered a literal, including [ ,:/.'@#], chinese, japonese, and arabic characters.
			default:
				return current;
		}
		if ( pad ) {
			ret = stringPad( ret, length );
		}
		return ret;
	});
};

});
