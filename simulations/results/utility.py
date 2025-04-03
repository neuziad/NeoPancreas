import os
import pandas as pd

def compile_performance_stats(root_dir, output_file):
    data = []
    
    # Walk through directories
    for dirpath, _, filenames in os.walk(root_dir):
        if "performance_stats.csv" in filenames:
            file_path = os.path.join(dirpath, "performance_stats.csv")
            print(f"Processing: {file_path}")
            
            # Read CSV and append to list
            try:
                df = pd.read_csv(file_path)
                df["source_directory"] = dirpath
                data.append(df)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    
    # Combine all dataframes
    if data:
        combined_df = pd.concat(data, ignore_index=True)
        combined_df.to_csv(output_file, index=False)
        print(f"Compiled data saved to {output_file}")
    else:
        print("No performance_stats.csv files found.")

if __name__ == "__main__":
    root_directory = "/simulations/results"
    compile_performance_stats(root_directory, "compiled_performance_stats.csv")
