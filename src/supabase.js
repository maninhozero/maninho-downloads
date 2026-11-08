import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ciuioimugqwkhppevurs.supabase.co";

const supabaseKey = "sb_publishable_BsVS43BDFCBdTFuGpfwNGw_HzD8P17J";

export const supabase = createClient(supabaseUrl, supabaseKey);