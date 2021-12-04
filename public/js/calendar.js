/* eslint-disable jquery/no-load */
/* eslint-disable jquery/no-ajax */
/* eslint-disable jquery/no-ready */

// Getting references to the logout button element
const $logoutButton = $('#logoutButton');

//Storing the user's email
const userEmailRef = sessionStorage.getItem('userEmail');

//Storing the user's userType
const userType = sessionStorage.getItem('userType');

//Storing the user's Id
const UserID = sessionStorage.getItem('userId');

//------------------------------------------------
// Initialising the calendar
//------------------------------------------------
// only want to do it if we are showing the calendar page
var calendarDiv = document.getElementById('calendarDiv');

function startDatetimeValid(start) {
    return Date.now() < new Date(start);
}

function updateBooking(bookingInfo) {
    if (startDatetimeValid(bookingInfo.event.start)) {
        // update session storage for use across files
        sessionStorage.setItem('newEvent', false);
        sessionStorage.setItem('subjectId', bookingInfo.event.extendedProps.subjectId);
        if (userType === 'student') {
            sessionStorage.setItem('tutorId', bookingInfo.event.extendedProps.tutorId);
        }

        $('#bookingDivWithID').data('bookingID', bookingInfo.event.id);
        $('#bookingModal').modal('show');
        //formatting the date object into a string
        let startTimeStr = dayjs(bookingInfo.event.start).format();
        let endTimeStr = dayjs(bookingInfo.event.end).format();
        //removing the timezone offset from the string
        let startTime = startTimeStr.slice(0, -6);
        let endTime = endTimeStr.slice(0, -6);
        $('#bookingStartTime-input').val(startTime);
        $('#bookingEndTime-input').val(endTime);
        $('#bookingNotes-input').val(bookingInfo.event.extendedProps.description);
        $('#videoLink-input').val(bookingInfo.event.extendedProps.videoLink);
    } else {
        window.alert('cannot modify events that have already passed');
    }
}

if (calendarDiv) {
    document.addEventListener('DOMContentLoaded', function () {
        //build calendar and methods

        var calendar = new FullCalendar.Calendar(calendarDiv, {
            // Interaction plugin required to detect dateClick actions, selectable actions, and event drag-n-drop/resizing while
            // timeGrid plugin presents a calendar view with a range of dates (e.g. a week) with each date in that range
            // having its own column. The rows represent the hourly periods within each day column
            plugins: ['interaction', 'timeGrid'],

            header: {
                //left: prev,next buttons to move the date range backwards and forwards one week
                left: 'prev,next today',
                //center: title represents the current week period (e.g Nov 22 - 28, 2020)
                center: 'title',
                //right: 'timeGridWeek, timeGridDay allow you to choose between the default week view, or a single-day view
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
            },

            //defaultDate: '2020-11-22', went for international standard date notation to avoid confusion for different locales
            defaultDate: dayjs().format('YYYY-MM-DD'),

            // can click day/week names to navigate views
            navLinks: true,

            // users can click a timeslot (or click and drag to cover a larger time window) to trigger a callback in which we can add an event
            selectable: true,

            //allows events to be edited - dragged, dropped, resized
            editable: true,

            // allow "more" link when too many events
            eventLimit: true,

            // Determines if events being dragged and resized are allowed to overlap each other.
            // If given a function, the function will be called every time there is a pair of intersecting
            // events, whether upon a user drag or resize. The function must return true if the overlap
            // should be allowed and false otherwise. The below allows overlapping only if both events are all-day
            eventOverlap: function (stillEvent, movingEvent) {
                return stillEvent.allDay && movingEvent.allDay;
            },

            //set to true shows an 'all day' row at the top of the calendar
            allDaySlot: true,

            //set the start time of the calendar
            minTime: '08:00:00',

            //set the end time of the calender
            maxTime: '18:00:00',

            //show a marker for the current day and time
            nowIndicator: true,

            //removes empty space in the calendar
            height: 'auto',

            //function to prepare the Event Source by mapping the API JSON response to a fullcalender Event Object.
            events: function (info, successCallback, failureCallback) {
                $.ajax({
                    // calling the appropriate endpoint
                    // there is an option to specify to only fetch events that match the current view period:
                    // data :{
                    // start: info.start.valueOf(),
                    // end: info.end.valueOf()
                    // }
                    url: `/api/bookings/${sessionStorage.getItem('userId')}/${sessionStorage.getItem('userType')}`,
                    type: 'GET',
                    success: function (res) {
                        let mappedEvents = res.map(function (event) {
                            //convert the time object returned by the database into something the calendar can recognise
                            let fixedStart = new Date(event.startTime);
                            let fixedEnd = new Date(event.endTime);
                            //different event save properties for student and for tutors
                            //(obviously a tutor won't need their own name to show as the title of the booking)
                            if (userType === 'student') {
                                return {
                                    id: event.id,
                                    title: event.tutor.firstName + ' ' + event.tutor.lastName,
                                    start: fixedStart,
                                    end: fixedEnd,
                                    extendedProps: {
                                        subjectName: event.Subject.name,
                                        subjectId: event.Subject.id,
                                        videoLink: event.videoLink,
                                        tutorId: event.tutor.id,
                                        //when the user is a student, StudentId and userId should be the same
                                        StudentId: event.StudentId,
                                        userId: UserID,
                                    },
                                    description: event.notes,
                                    backgroundColor: startDatetimeValid(event.startTime) ? '#3788d8' : 'lightslategray',
                                };
                            } else {
                                return {
                                    id: event.id,
                                    title: event.student.firstName + ' ' + event.student.lastName,
                                    start: fixedStart,
                                    end: fixedEnd,
                                    extendedProps: {
                                        subjectName: event.Subject.name,
                                        subjectId: event.Subject.id,
                                        videoLink: event.videoLink,
                                        StudentId: event.StudentId,
                                        userId: UserID,
                                    },
                                    description: event.notes,
                                    backgroundColor: startDatetimeValid(event.startTime) ? '#3788d8' : 'lightslategray',
                                };
                            }
                        });
                        successCallback(mappedEvents);
                    },
                    failure: function (err) {
                        alert('there was an error while fetching calendar events');
                        failureCallback(err);
                    },
                    textColor: 'white', // a non-ajax option
                });
            },

            //------------------------------------------------
            // Calendar clicks and interaction
            //------------------------------------------------

            //clicking/clicking & dragging a date/time/period of dates or times fires this
            //only available to Students as Tutors shouldn't be creating requests for tutor sessions
            select: function (info) {
                if (userType === 'student') {
                    if (startDatetimeValid(info.startStr)) {
                        sessionStorage.setItem('newEvent', true);
                        $('#bookingModal').modal('show');
                        //removing the timezone offset from the string
                        let startTime = info.startStr.slice(0, -6);
                        let endTime = info.endStr.slice(0, -6);
                        $('#bookingStartTime-input').val(startTime);
                        $('#bookingEndTime-input').val(endTime);
                    } else {
                        window.alert('Bookings can only be made in the future.');
                    }
                } else {
                    window.alert('Only students can create new bookings.');
                }
            },

            //clicking an event fires this
            eventClick: function (info) {
                updateBooking(info);
            },

            //function handling when the event is resized (ie, time changed)
            eventResize: function (info) {
                updateBooking(info);
            },

            //when an existing event is dragged and dropped
            eventDrop: function (info) {
                updateBooking(info);
            },

            eventAllow: function (dropInfo, draggedEvent) {
                return startDatetimeValid(dropInfo.start);
            },
        });
        //------------------------------------------------
        // Rendering the calendar
        //------------------------------------------------

        $(window).on('load', function () {
            calendar.render();
            $logoutButton.html(userEmailRef);
        });
    });
}
