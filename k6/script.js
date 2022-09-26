import http from 'k6/http';
import {check, sleep} from 'k6';
import {Rate} from 'k6/metrics';

const reqRate = new Rate('http_req_rate');

export const options = {
    stages: [
        {target: 20, duration: '20s'},
        {target: 0, duration: '5s'},
    ],
    thresholds: {
        'checks': ['rate>0.9'],
        'http_req_duration': ['p(95)<1000'],
        'http_req_rate{deployment:stable}': ['rate>=0'],
        'http_req_rate{deployment:canary}': ['rate>=0'],
    },
};

export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.get(`http://localhost/`, params);
    check(res, {
        'status code is 200': (r) => r.status === 200,
        'version is 0.1 or 0.2': (r) => r.json().version === '0.1' || r.json().version === '0.2',
    });

    switch (res.json().version) {
        case '0.1':
            reqRate.add(true, { deployment: 'stable' });
            reqRate.add(false, { deployment: 'canary' });
            break;
        case '0.2':
            reqRate.add(false, { deployment: 'stable' });
            reqRate.add(true, { deployment: 'canary' });
            break;
    }

    sleep(1);
}
