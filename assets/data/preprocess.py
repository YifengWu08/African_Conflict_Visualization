import pandas as pd
import numpy as np
import pycountry


df = pd.read_csv("african_conflicts_copy.csv", encoding='ISO-8859-1')

df['country_code'] = np.nan
df['value'] = np.nan

# 3. Save the modified DataFrame back to the CSV file


def get_country_code(country_name):
    try:
        return pycountry.countries.get(name=country_name).alpha_3
    except AttributeError:
        # Return None or some default value if the country was not found
        return None

df['country_code'] = df['COUNTRY'].apply(get_country_code)


df.to_csv('african_conflicts_copy.csv', index=False)


