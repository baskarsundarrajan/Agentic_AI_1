import datetime
from zoneinfo import ZoneInfo
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


SCOPES = ["https://www.googleapis.com/auth/calendar"]


class GoogleCalendar:
    def __init__(self): ...

    def connect(self, file):
        creds = None

        if os.path.exists("token.json"):
            creds = Credentials.from_authorized_user_file("token.json", SCOPES)
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(file, SCOPES)
                creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open("token.json", "w") as token:
                token.write(creds.to_json())

        try:
            self.__service = build("calendar", "v3", credentials=creds)
            print("connected successful")
        except HttpError as error:
            print(f"An error occurred: {error}")

    def get_events(self, max_period: str = "10d"):
        """
        Returns calendar events within a given period starting from today.

        Parameters:
            max_period (str): Defines the maximum date range to fetch events.
                Supported formats:
                    - "{N}d" → N days from today (e.g., "30d")
                    - "{N}m" → N months from today (e.g., "6m")
                    - "YYYY-MM-DD" → specific end date (e.g., "2022-11-14")
                Default is "10d" (10 days).

        Example:
            get_events()                # events for next 10 days
            get_events("30d")           # events for next 30 days
            get_events("6m")            # events for next 6 months
            get_events("2022-12-31")    # events until specific date
        """
        now = datetime.now(tz=ZoneInfo("Asia/Kolkata"))
        print(max_period)
        # Determine end date
        if max_period.endswith("d"):  # days
            days = int(max_period[:-1])
            max_ = now + timedelta(days=days)
        elif max_period.endswith("m"):  # months
            months = int(max_period[:-1])
            max_ = now + relativedelta(months=months)
        else:
            try:
                max_ = datetime.fromisoformat(max_period).replace(
                    tzinfo=ZoneInfo("Asia/Kolkata")
                )+ timedelta(days=1)
            except ValueError:
                raise ValueError(
                    "Invalid max_period format. Use '{N}d', '{N}m', or 'YYYY-MM-DD'."
                )

        print(f"Getting events from {now.date()} to {max_.date()} {max_.isoformat()}")

        events_result = (
            self.__service.events()
            .list(
                calendarId="primary",
                timeMin=now.isoformat(),
                timeMax=max_.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )


        events = events_result.get("items", [])
        all_events = []

        for event in events:
            event_dict = {
                "id": event.get("id"),  
                "summary": event.get("summary", "No Title"),
                "start": event.get("start"),
                "end": event.get("end"),
            }
            all_events.append(event_dict)

        return all_events

    def create_event(self, events):
        print("hello function called")
        event = (
            self.__service.events().insert(calendarId="primary", body=events).execute()
        )
        print(f"Event created:{event.get('htmlLink')}")
        return event

    def delete_event(self, event_id: str):
        """
        Deletes an event from the user's primary Google Calendar.

        Parameters:
            event_id (str): The unique ID of the calendar event to delete.

        Example:
            delete_event("abc123xyz")
        """
        try:
            self.__service.events().delete(
                calendarId="primary", eventId=event_id
            ).execute()
            print(f"✅ Event deleted successfully (ID: {event_id})")
            return True
        except HttpError as error:
            print(f"❌ An error occurred while deleting the event: {error}")
            return False


if "__main__" == __name__:
    google_cal = GoogleCalendar()

    google_cal.connect("credentials.json")
    google_cal.get_events()

    event = {
        "summary": "Google I/O 2015",
        "location": "800 Howard St., San Francisco, CA 94103",
        "description": "A chance to hear more about Google's developer products.",
        "start": {
            "dateTime": "2025-10-23T09:00:00+05:30",
            # 'timeZone': 'India/Kolkota',
        },
        "end": {
            "dateTime": "2025-10-23T10:00:00+05:30",
            # 'timeZone': 'India/Kolkota',
        },
    }

    google_cal.create_event(event)
