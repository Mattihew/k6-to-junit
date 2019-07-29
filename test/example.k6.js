import {check} from "k6";
import * as http from "k6/http";
import { Rate } from "k6/metrics";

export const errors = new Rate("errors");

export const options = {
    iterations: 20,
    thresholds: {
        errors: ["rate>0.99"],
        checks: ["rate<2"]
    }
};

let i = 1;

export default function() {
    const res = http.get(`http://jsonplaceholder.typicode.com/users/${i++}`);
    const result = check(res, {
        "is status 200": r => r.status === 200,
        "not empty": r => Object.keys(r.json()).length > 0
    });
    errors.add(result ? 0 : 1);
}
