import os
import sys
from datetime import datetime, timedelta
from score_agent import fetch_and_insert_for_date, log

def run():
    log("Starting Future Schedule Fetch (Next 30 Days)...")
    
    utc_now = datetime.now()
    
    for i in range(1, 31):
        future_date = utc_now + timedelta(days=i)
        fetch_and_insert_for_date(future_date)
        
    log("Finished fetching future schedule!")

if __name__ == "__main__":
    run()
