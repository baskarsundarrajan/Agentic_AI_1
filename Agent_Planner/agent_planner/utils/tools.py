from langchain_core.tools import tool
from .google_calendar import GoogleCalendar

google_cal = GoogleCalendar()
google_cal.connect("credentials.json")


@tool()
def get_events(max_period:str = "10d") -> list:
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
    return google_cal.get_events(max_period)


from langchain_core.tools import tool

@tool
def create_event(
    summary: str = None,
    description: str = None,
    strt_dateTime: str = None,
    end_dateTime: str = None,
    events_list: list[dict] = None,
    **kwargs
) -> list[dict]:
    """
    Creates one or more events on Google Calendar.

    You have two modes:
    1. Pass in summary+description+strt_dateTime+end_dateTime to create a single event.
    2. Or pass in events_list: a list of dicts each of form
       {
         "summary": "...",
         "description": "...",
         "start": {"dateTime": "..."},
         "end":   {"dateTime": "..."}
       }

    Returns a list of created event‐objects (or a single‐item list for the single event mode).
    """
    created_events = []

    if events_list is not None:
        # Loop mode
        for ev in events_list:
            # event_payload = {
            #     "summary": ev.get("summary"),
            #     "description": ev.get("description"),
            #     "start": {"dateTime": ev["start"]["dateTime"]},
            #     "end":   {"dateTime": ev["end"]["dateTime"]},
            # }
            created = google_cal.create_event(ev)
            created_events.append(created)
    else:
        # Single‐event mode
        if None in (summary, description, strt_dateTime, end_dateTime):
            raise ValueError("Must supply either events_list or all of summary/description/strt_dateTime/end_dateTime")
        event_payload = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": strt_dateTime},
            "end":   {"dateTime": end_dateTime},
        }
        created = google_cal.create_event(event_payload)
        created_events.append(created)

    return created_events


@tool
def delete_event(event_id:str):
    """
        Deletes an event from the user's primary Google Calendar.
        use the get_event tool to extract the event id

        Parameters:
            event_id (str): The unique ID of the calendar event to delete.

        Example:
            delete_event("abc123xyz")
        """
    return google_cal.delete_event(event_id)
